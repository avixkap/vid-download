use crate::models::{now_ms, HistoryItem, ScheduledItem, Settings};
use std::fs;
use std::path::{Path, PathBuf};

const MAX_HISTORY: usize = 500;

fn settings_file(data_dir: &Path) -> PathBuf {
    data_dir.join("settings.json")
}

fn history_file(data_dir: &Path) -> PathBuf {
    data_dir.join("history.json")
}

fn scheduled_file(data_dir: &Path) -> PathBuf {
    data_dir.join("scheduled.json")
}

fn default_download_dir() -> String {
    dirs_download().unwrap_or_else(|| PathBuf::from("."))
        .join("VidDownload")
        .to_string_lossy()
        .into_owned()
}

fn dirs_download() -> Option<PathBuf> {
    // Windows: %USERPROFILE%\Downloads; fallback to home dir.
    std::env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .map(|p| p.join("Downloads"))
        .or_else(|| std::env::var_os("HOME").map(PathBuf::from))
}

pub fn load_settings(data_dir: &Path) -> Settings {
    let mut settings = fs::read_to_string(settings_file(data_dir))
        .ok()
        .and_then(|s| serde_json::from_str::<Settings>(&s).ok())
        .unwrap_or_default();
    if settings.download_dir.is_empty() {
        settings.download_dir = default_download_dir();
    }
    let _ = fs::create_dir_all(&settings.download_dir);
    settings
}

pub fn save_settings(data_dir: &Path, settings: &Settings) {
    let _ = fs::create_dir_all(data_dir);
    if let Ok(json) = serde_json::to_string_pretty(settings) {
        let _ = fs::write(settings_file(data_dir), json);
    }
    let _ = fs::create_dir_all(&settings.download_dir);
}

pub fn list_history(data_dir: &Path) -> Vec<HistoryItem> {
    fs::read_to_string(history_file(data_dir))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn add_history(
    data_dir: &Path,
    title: String,
    url: String,
    file_path: Option<String>,
    thumbnail: Option<String>,
    format: String,
) {
    let mut items = list_history(data_dir);
    items.insert(
        0,
        HistoryItem {
            id: uuid::Uuid::new_v4().to_string(),
            title,
            url,
            file_path,
            thumbnail,
            format,
            downloaded_at: now_ms(),
        },
    );
    items.truncate(MAX_HISTORY);
    if let Ok(json) = serde_json::to_string_pretty(&items) {
        let _ = fs::write(history_file(data_dir), json);
    }
}

pub fn clear_history(data_dir: &Path) {
    let _ = fs::write(history_file(data_dir), "[]");
}

pub fn load_scheduled(data_dir: &Path) -> Vec<ScheduledItem> {
    fs::read_to_string(scheduled_file(data_dir))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_scheduled(data_dir: &Path, items: &[ScheduledItem]) {
    if let Ok(json) = serde_json::to_string_pretty(items) {
        let _ = fs::write(scheduled_file(data_dir), json);
    }
}
