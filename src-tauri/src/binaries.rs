use crate::models::{BinaryProgress, BinaryStatus};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

const YTDLP_URL: &str = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
const FFMPEG_URL: &str = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";

pub fn bin_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("bin")
}

pub fn ytdlp_path(data_dir: &Path) -> PathBuf {
    bin_dir(data_dir).join(if cfg!(windows) { "yt-dlp.exe" } else { "yt-dlp" })
}

pub fn ffmpeg_path(data_dir: &Path) -> PathBuf {
    bin_dir(data_dir).join(if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" })
}

#[cfg(windows)]
fn hide_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000);
}

#[cfg(not(windows))]
fn hide_window(_cmd: &mut Command) {}

pub fn status(data_dir: &Path) -> BinaryStatus {
    let ytdlp = ytdlp_path(data_dir);
    let yt_exists = ytdlp.exists();
    let ff_exists = ffmpeg_path(data_dir).exists();
    let mut ytdlp_version = None;
    if yt_exists {
        let mut cmd = Command::new(&ytdlp);
        cmd.arg("--version").stdout(Stdio::piped()).stderr(Stdio::null());
        hide_window(&mut cmd);
        if let Ok(out) = cmd.output() {
            if out.status.success() {
                ytdlp_version = Some(String::from_utf8_lossy(&out.stdout).trim().to_string());
            }
        }
    }
    BinaryStatus {
        ytdlp: yt_exists,
        ffmpeg: ff_exists,
        ytdlp_version,
    }
}

fn emit(app: &AppHandle, component: &str, percent: u32, stage: &str) {
    let _ = app.emit(
        "binaries:progress",
        BinaryProgress {
            component: component.into(),
            percent,
            stage: stage.into(),
        },
    );
}

fn download(url: &str, dest: &Path, mut on_progress: impl FnMut(u32)) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("vid-download-app")
        .build()
        .map_err(|e| e.to_string())?;
    let mut resp = client.get(url).send().map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {} downloading {url}", resp.status()));
    }
    let total = resp.content_length().unwrap_or(0);
    let mut received: u64 = 0;
    let mut file = fs::File::create(dest).map_err(|e| e.to_string())?;
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = resp.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        received += n as u64;
        if total > 0 {
            on_progress(((received * 99) / total) as u32);
        }
    }
    file.flush().map_err(|e| e.to_string())?;
    Ok(())
}

fn extract_ffmpeg(zip_path: &Path, bin_dir: &Path) -> Result<(), String> {
    let file = fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().replace('\\', "/");
        let base = name.rsplit('/').next().unwrap_or("").to_lowercase();
        let wanted = matches!(
            base.as_str(),
            "ffmpeg.exe" | "ffprobe.exe" | "ffmpeg" | "ffprobe"
        );
        // only take binaries from a bin/ folder inside the archive
        let in_bin = name.to_lowercase().contains("/bin/") || !name.contains('/');
        if wanted && in_bin {
            let out_path = bin_dir.join(&base);
            let mut out = fs::File::create(&out_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn install(app: &AppHandle, data_dir: &Path) -> Result<BinaryStatus, String> {
    let bin = bin_dir(data_dir);
    fs::create_dir_all(&bin).map_err(|e| e.to_string())?;

    let ytdlp = ytdlp_path(data_dir);
    if !ytdlp.exists() {
        emit(app, "yt-dlp", 0, "Downloading yt-dlp");
        let tmp = bin.join("yt-dlp.tmp");
        download(YTDLP_URL, &tmp, |p| emit(app, "yt-dlp", p, "Downloading yt-dlp"))?;
        fs::rename(&tmp, &ytdlp).map_err(|e| e.to_string())?;
        emit(app, "yt-dlp", 100, "yt-dlp ready");
    }

    let ffmpeg = ffmpeg_path(data_dir);
    if !ffmpeg.exists() {
        emit(app, "ffmpeg", 0, "Downloading ffmpeg (~80 MB)");
        let zip_path = bin.join("ffmpeg.zip");
        download(FFMPEG_URL, &zip_path, |p| emit(app, "ffmpeg", p, "Downloading ffmpeg"))?;
        emit(app, "ffmpeg", 100, "Extracting ffmpeg");
        let result = extract_ffmpeg(&zip_path, &bin);
        let _ = fs::remove_file(&zip_path);
        result?;
        if !ffmpeg.exists() {
            return Err("ffmpeg.exe not found inside the downloaded archive".into());
        }
        emit(app, "ffmpeg", 100, "ffmpeg ready");
    }

    Ok(status(data_dir))
}
