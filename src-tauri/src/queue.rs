use crate::models::{
    now_ms, DownloadJob, DownloadOptions, JobStatus, NewDownloadItem, Settings,
};
use crate::state::AppState;
use crate::{binaries, parser, store, ytdlp};
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, Manager};

pub fn list(state: &AppState) -> Vec<DownloadJob> {
    let mut jobs = state.jobs.lock().unwrap().clone();
    jobs.sort_by(|a, b| b.added_at.cmp(&a.added_at));
    jobs
}

fn emit_changed(app: &AppHandle, state: &AppState) {
    let _ = app.emit("queue:changed", list(state));
}

pub fn add_items(state: &AppState, items: Vec<NewDownloadItem>) -> Vec<DownloadJob> {
    let mut created = Vec::new();
    {
        let mut jobs = state.jobs.lock().unwrap();
        for i in items {
            let job = DownloadJob {
                id: uuid::Uuid::new_v4().to_string(),
                url: i.url,
                title: i.title,
                thumbnail: i.thumbnail,
                options: i.options,
                status: JobStatus::Queued,
                percent: 0.0,
                speed: None,
                eta: None,
                downloaded_bytes: 0,
                total_bytes: None,
                file_path: None,
                error: None,
                added_at: now_ms(),
            };
            jobs.push(job.clone());
            created.push(job);
        }
    }
    emit_changed(&state.app, state);
    pump(state);
    created
}

pub fn pause(state: &AppState, id: &str) {
    let pid = {
        let mut jobs = state.jobs.lock().unwrap();
        let Some(job) = jobs.iter_mut().find(|j| j.id == id) else {
            return;
        };
        if !job.status.is_active() {
            return;
        }
        job.status = JobStatus::Paused;
        state.procs.lock().unwrap().get(id).map(|c| c.id())
    };
    if let Some(pid) = pid {
        ytdlp::kill_tree(pid);
    }
    emit_changed(&state.app, state);
}

pub fn resume(state: &AppState, id: &str) {
    {
        let mut jobs = state.jobs.lock().unwrap();
        let Some(job) = jobs.iter_mut().find(|j| j.id == id) else {
            return;
        };
        if job.status != JobStatus::Paused {
            return;
        }
        job.status = JobStatus::Queued;
    }
    emit_changed(&state.app, state);
    pump(state);
}

pub fn cancel(state: &AppState, id: &str) {
    let pid = state.procs.lock().unwrap().get(id).map(|c| c.id());
    if let Some(pid) = pid {
        ytdlp::kill_tree(pid);
    }
    {
        let mut jobs = state.jobs.lock().unwrap();
        if let Some(job) = jobs.iter_mut().find(|j| j.id == id) {
            if job.status != JobStatus::Completed {
                job.status = JobStatus::Canceled;
            }
        }
    }
    emit_changed(&state.app, state);
}

pub fn remove(state: &AppState, id: &str) {
    let active = state
        .jobs
        .lock()
        .unwrap()
        .iter()
        .find(|j| j.id == id)
        .map(|j| j.status.is_active())
        .unwrap_or(false);
    if active {
        cancel(state, id);
    }
    state.jobs.lock().unwrap().retain(|j| j.id != id);
    emit_changed(&state.app, state);
}

pub fn retry(state: &AppState, id: &str) {
    {
        let mut jobs = state.jobs.lock().unwrap();
        let Some(job) = jobs.iter_mut().find(|j| j.id == id) else {
            return;
        };
        if job.status.is_active() {
            return;
        }
        job.status = JobStatus::Queued;
        job.percent = 0.0;
        job.error = None;
        job.speed = None;
        job.eta = None;
    }
    emit_changed(&state.app, state);
    pump(state);
}

pub fn pump(state: &AppState) {
    let (concurrency, download_dir) = {
        let s = state.settings.lock().unwrap();
        (s.concurrency.max(1) as usize, s.download_dir.clone())
    };
    let bin_dir = binaries::bin_dir(&state.data_dir);

    let mut to_start: Vec<(String, String, DownloadOptions)> = Vec::new();
    {
        let mut jobs = state.jobs.lock().unwrap();
        let active = jobs.iter().filter(|j| j.status.is_active()).count();
        let mut slots = concurrency.saturating_sub(active);
        for job in jobs.iter_mut() {
            if slots == 0 {
                break;
            }
            if job.status != JobStatus::Queued {
                continue;
            }
            job.status = JobStatus::Downloading;
            job.error = None;
            to_start.push((job.id.clone(), job.url.clone(), job.options.clone()));
            slots -= 1;
        }
    }
    if to_start.is_empty() {
        return;
    }
    emit_changed(&state.app, state);
    let settings = state.settings.lock().unwrap().clone();
    for (id, url, opts) in to_start {
        start_process(state, &id, &url, &opts, &bin_dir, Path::new(&download_dir), &settings);
    }
}

fn start_process(
    state: &AppState,
    id: &str,
    url: &str,
    opts: &DownloadOptions,
    bin_dir: &Path,
    download_dir: &Path,
    settings: &Settings,
) {
    match ytdlp::spawn_download(bin_dir, download_dir, opts, url, settings) {
        Err(e) => fail(state, id, &format!("Failed to start yt-dlp: {e}")),
        Ok(mut child) => {
            let stdout = match child.stdout.take() {
                Some(s) => s,
                None => return fail(state, id, "Failed to capture yt-dlp output"),
            };
            let stderr = child.stderr.take();
            state.procs.lock().unwrap().insert(id.to_string(), child);

            let tail = Arc::new(Mutex::new(String::new()));
            state
                .stderr_tails
                .lock()
                .unwrap()
                .insert(id.to_string(), tail.clone());

            if let Some(mut stderr) = stderr {
                thread::spawn(move || {
                    let mut buf = [0u8; 8192];
                    loop {
                        match stderr.read(&mut buf) {
                            Ok(0) | Err(_) => break,
                            Ok(n) => {
                                let mut t = tail.lock().unwrap();
                                t.push_str(&String::from_utf8_lossy(&buf[..n]));
                                if t.len() > 4000 {
                                    let cut = t.len() - 2000;
                                    let keep = t.split_off(cut);
                                    *t = keep;
                                }
                            }
                        }
                    }
                });
            }

            let app = state.app.clone();
            let job_id = id.to_string();
            thread::spawn(move || {
                {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        let Ok(line) = line else { break };
                        let Some(p) = parser::parse_line(line.trim()) else {
                            continue;
                        };
                        let state = app.state::<AppState>();
                        let (snapshot, status_changed) = {
                            let mut jobs = state.jobs.lock().unwrap();
                            let Some(job) = jobs.iter_mut().find(|j| j.id == job_id) else {
                                break;
                            };
                            let mut status_changed = false;
                            if p.status == Some("processing") && job.status == JobStatus::Downloading
                            {
                                job.status = JobStatus::Processing;
                                status_changed = true;
                            }
                            if let Some(d) = p.downloaded_bytes {
                                job.downloaded_bytes = d;
                            }
                            if let Some(t) = p.total_bytes {
                                job.total_bytes = Some(t);
                            }
                            if let Some(pct) = p.percent {
                                job.percent = pct;
                            }
                            if let Some(s) = p.speed {
                                job.speed = Some(s);
                            }
                            if let Some(e) = p.eta {
                                job.eta = Some(e);
                            }
                            if let Some(f) = p.file_path {
                                job.file_path = Some(f);
                            }
                            (job.clone(), status_changed)
                        };
                        let _ = app.emit("download:progress", &snapshot);
                        if status_changed {
                            emit_changed(&app, &state);
                        }
                    }
                }
                // stdout closed: process is exiting — reap it
                let state = app.state::<AppState>();
                let code = {
                    let child = state.procs.lock().unwrap().remove(&job_id);
                    child
                        .and_then(|mut c| c.wait().ok())
                        .and_then(|s| s.code())
                };
                finish(&app, &job_id, code);
            });
        }
    }
}

fn finish(app: &AppHandle, id: &str, code: Option<i32>) {
    let state = app.state::<AppState>();
    let snapshot = {
        let mut jobs = state.jobs.lock().unwrap();
        let Some(job) = jobs.iter_mut().find(|j| j.id == id) else {
            return;
        };
        match job.status {
            JobStatus::Paused | JobStatus::Canceled => {}
            _ => {
                if code == Some(0) {
                    job.status = JobStatus::Completed;
                    job.percent = 100.0;
                    job.speed = None;
                    job.eta = None;
                    let format = if job.options.audio_only {
                        job.options.audio_format.clone()
                    } else {
                        job.options.container.clone()
                    };
                    store::add_history(
                        &state.data_dir,
                        job.title.clone(),
                        job.url.clone(),
                        job.file_path.clone(),
                        job.thumbnail.clone(),
                        format,
                    );
                } else {
                    let tail = state
                        .stderr_tails
                        .lock()
                        .unwrap()
                        .get(id)
                        .and_then(|t| {
                            t.lock()
                                .unwrap()
                                .lines()
                                .filter(|l| !l.trim().is_empty())
                                .last()
                                .map(|s| s.trim().to_string())
                        });
                    job.status = JobStatus::Error;
                    job.error = Some(
                        tail.unwrap_or_else(|| format!("yt-dlp exited with code {code:?}")),
                    );
                    job.speed = None;
                    job.eta = None;
                }
            }
        }
        job.clone()
    };
    state.stderr_tails.lock().unwrap().remove(id);
    let _ = app.emit("download:progress", &snapshot);
    emit_changed(app, &state);
    pump(&state);
}

fn fail(state: &AppState, id: &str, msg: &str) {
    let snapshot = {
        let mut jobs = state.jobs.lock().unwrap();
        let Some(job) = jobs.iter_mut().find(|j| j.id == id) else {
            return;
        };
        job.status = JobStatus::Error;
        job.error = Some(msg.into());
        job.speed = None;
        job.eta = None;
        job.clone()
    };
    let _ = state.app.emit("download:progress", &snapshot);
    emit_changed(&state.app, state);
    pump(state);
}
