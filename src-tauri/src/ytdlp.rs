use crate::models::{AnalysisResult, DownloadOptions, PlaylistEntry, Settings, VideoInfo};
use serde_json::Value;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};

pub const PROGRESS_TEMPLATE: &str = "download:PROG|%(progress.status)s|%(progress.downloaded_bytes)s|%(progress.total_bytes_estimate)s|%(progress.total_bytes)s|%(progress.speed)s|%(progress.eta)s";

pub fn ytdlp_exe(bin_dir: &Path) -> PathBuf {
    bin_dir.join(if cfg!(windows) { "yt-dlp.exe" } else { "yt-dlp" })
}

#[cfg(windows)]
fn hide_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
}

#[cfg(not(windows))]
fn hide_window(_cmd: &mut Command) {}

fn browser_profile_dir(browser: &str) -> Option<PathBuf> {
    let local = PathBuf::from(std::env::var_os("LOCALAPPDATA")?);
    let roaming = PathBuf::from(std::env::var_os("APPDATA")?);
    Some(match browser {
        "chrome" => local.join(r"Google\Chrome\User Data"),
        "edge" => local.join(r"Microsoft\Edge\User Data"),
        "brave" => local.join(r"BraveSoftware\Brave-Browser\User Data"),
        "vivaldi" => local.join(r"Vivaldi\User Data"),
        "opera" => roaming.join(r"Opera Software\Opera Stable"),
        "firefox" => roaming.join(r"Mozilla\Firefox\Profiles"),
        _ => return None,
    })
}

fn cookies_args(s: &Settings) -> Vec<String> {
    if !s.cookies_file.is_empty() {
        return vec!["--cookies".into(), s.cookies_file.clone()];
    }
    if !s.cookies_browser.is_empty() {
        // yt-dlp hard-fails when the browser isn't installed, which would break every request
        if cfg!(windows) {
            if let Some(dir) = browser_profile_dir(&s.cookies_browser) {
                if !dir.exists() {
                    return vec![];
                }
            }
        }
        return vec!["--cookies-from-browser".into(), s.cookies_browser.clone()];
    }
    vec![]
}

fn quality_format(q: &str) -> String {
    match q {
        "best" => "bv*+ba/b".into(),
        "worst" => "wv*+wa/w".into(),
        n => format!("bv*[height<={n}]+ba/b[height<={n}]/b"),
    }
}

fn clean_error(err: &str, fallback: &str) -> String {
    let lines: Vec<&str> = err
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with("WARNING"))
        .collect();
    let picked = lines
        .iter()
        .find(|l| l.starts_with("ERROR:"))
        .or_else(|| lines.last())
        .copied()
        .unwrap_or(fallback);
    picked
        .trim_start_matches("ERROR:")
        .trim()
        .chars()
        .take(300)
        .collect()
}

fn map_info(json: &Value, source_url: &str) -> VideoInfo {
    let entries: Option<Vec<PlaylistEntry>> = json["entries"].as_array().map(|arr| {
        arr.iter()
            .filter(|e| !e.is_null())
            .map(|e| PlaylistEntry {
                id: e["id"].as_str().unwrap_or("").to_string(),
                title: e["title"].as_str().unwrap_or("Untitled").to_string(),
                url: e["url"]
                    .as_str()
                    .or_else(|| e["webpage_url"].as_str())
                    .unwrap_or("")
                    .to_string(),
                duration: e["duration"].as_f64(),
                thumbnail: e["thumbnail"]
                    .as_str()
                    .map(String::from)
                    .or_else(|| {
                        e["thumbnails"]
                            .as_array()
                            .and_then(|t| t.first())
                            .and_then(|t| t["url"].as_str())
                            .map(String::from)
                    }),
            })
            .collect()
    });
    let is_playlist = entries.is_some();
    let mut heights: Vec<u32> = Vec::new();
    if !is_playlist {
        if let Some(formats) = json["formats"].as_array() {
            for f in formats {
                let vcodec = f["vcodec"].as_str().unwrap_or("none");
                if vcodec != "none" {
                    if let Some(h) = f["height"].as_u64() {
                        let h = h as u32;
                        if !heights.contains(&h) {
                            heights.push(h);
                        }
                    }
                }
            }
        }
        heights.sort_by(|a, b| b.cmp(a));
    }
    VideoInfo {
        url: source_url.to_string(),
        id: json["id"].as_str().unwrap_or("").to_string(),
        title: json["title"]
            .as_str()
            .or_else(|| json["webpage_url"].as_str())
            .unwrap_or("Unknown")
            .to_string(),
        thumbnail: json["thumbnail"].as_str().map(String::from),
        duration: json["duration"].as_f64(),
        uploader: json["uploader"]
            .as_str()
            .or_else(|| json["channel"].as_str())
            .map(String::from),
        extractor: json["extractor_key"]
            .as_str()
            .or_else(|| json["extractor"].as_str())
            .map(String::from),
        is_playlist,
        entries,
        heights,
    }
}

pub fn fetch_info(bin_dir: &Path, settings: &Settings, url: &str) -> AnalysisResult {
    let mut cmd = Command::new(ytdlp_exe(bin_dir));
    cmd.args(["-J", "--flat-playlist", "--no-warnings"])
        .args(cookies_args(settings))
        .arg("--")
        .arg(url)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    hide_window(&mut cmd);
    match cmd.output() {
        Err(e) => AnalysisResult {
            url: url.into(),
            info: None,
            error: Some(format!("Failed to start yt-dlp: {e}")),
        },
        Ok(out) if out.status.success() => match serde_json::from_slice::<Value>(&out.stdout) {
            Ok(json) => AnalysisResult {
                url: url.into(),
                info: Some(map_info(&json, url)),
                error: None,
            },
            Err(_) => AnalysisResult {
                url: url.into(),
                info: None,
                error: Some("Failed to parse video info".into()),
            },
        },
        Ok(out) => AnalysisResult {
            url: url.into(),
            info: None,
            error: Some(clean_error(
                &String::from_utf8_lossy(&out.stderr),
                "yt-dlp failed",
            )),
        },
    }
}

pub fn spawn_download(
    bin_dir: &Path,
    download_dir: &Path,
    opts: &DownloadOptions,
    url: &str,
    settings: &Settings,
) -> io::Result<Child> {
    let mut args: Vec<String> = vec![
        "--newline".into(),
        "--progress-template".into(),
        PROGRESS_TEMPLATE.into(),
        "--no-warnings".into(),
        "--ignore-errors".into(),
        "--continue".into(),
    ];
    args.extend(cookies_args(settings));
    args.extend([
        "--ffmpeg-location".into(),
        bin_dir.to_string_lossy().into_owned(),
        "--paths".into(),
        download_dir.to_string_lossy().into_owned(),
        "-o".into(),
        "%(playlist_index&{} - |)s%(title)s.%(ext)s".into(),
        if opts.playlist { "--yes-playlist" } else { "--no-playlist" }.into(),
    ]);
    if opts.audio_only {
        args.extend([
            "-f".into(),
            "ba/b".into(),
            "-x".into(),
            "--audio-format".into(),
            opts.audio_format.clone(),
            "--audio-quality".into(),
            "0".into(),
        ]);
    } else {
        args.extend(["-f".into(), quality_format(&opts.quality)]);
        if opts.container != "any" {
            args.extend(["--merge-output-format".into(), opts.container.clone()]);
        }
    }
    if opts.subtitles && !opts.audio_only {
        let langs = if opts.sub_langs.is_empty() {
            "en.*"
        } else {
            &opts.sub_langs
        };
        args.extend(["--write-subs".into(), "--sub-langs".into(), langs.into()]);
        if opts.embed_subs {
            args.push("--embed-subs".into());
        }
    }
    args.extend(["--".into(), url.into()]);

    let mut cmd = Command::new(ytdlp_exe(bin_dir));
    cmd.args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());
    hide_window(&mut cmd);
    cmd.spawn()
}

pub fn kill_tree(pid: u32) {
    if cfg!(windows) {
        let mut cmd = Command::new("taskkill");
        cmd.args(["/pid", &pid.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        hide_window(&mut cmd);
        let _ = cmd.status();
    } else {
        let _ = Command::new("kill").arg(pid.to_string()).status();
    }
}
