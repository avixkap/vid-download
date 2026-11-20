use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DownloadOptions {
    pub quality: String,
    pub audio_only: bool,
    pub audio_format: String,
    pub container: String,
    pub subtitles: bool,
    pub sub_langs: String,
    pub embed_subs: bool,
    pub playlist: bool,
}

impl Default for DownloadOptions {
    fn default() -> Self {
        Self {
            quality: "best".into(),
            audio_only: false,
            audio_format: "mp3".into(),
            container: "mp4".into(),
            subtitles: false,
            sub_langs: "en.*".into(),
            embed_subs: true,
            playlist: true,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub download_dir: String,
    pub concurrency: u32,
    pub default_quality: String,
    pub default_audio_only: bool,
    pub default_audio_format: String,
    pub default_container: String,
    pub sub_langs: String,
    pub cookies_browser: String,
    pub cookies_file: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            download_dir: String::new(),
            concurrency: 2,
            default_quality: "best".into(),
            default_audio_only: false,
            default_audio_format: "mp3".into(),
            default_container: "mp4".into(),
            sub_langs: "en.*".into(),
            cookies_browser: String::new(),
            cookies_file: String::new(),
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SettingsPatch {
    pub download_dir: Option<String>,
    pub concurrency: Option<u32>,
    pub default_quality: Option<String>,
    pub default_audio_only: Option<bool>,
    pub default_audio_format: Option<String>,
    pub default_container: Option<String>,
    pub sub_langs: Option<String>,
    pub cookies_browser: Option<String>,
    pub cookies_file: Option<String>,
}

impl Settings {
    pub fn apply(&mut self, p: SettingsPatch) {
        if let Some(v) = p.download_dir {
            self.download_dir = v;
        }
        if let Some(v) = p.concurrency {
            self.concurrency = v.clamp(1, 4);
        }
        if let Some(v) = p.default_quality {
            self.default_quality = v;
        }
        if let Some(v) = p.default_audio_only {
            self.default_audio_only = v;
        }
        if let Some(v) = p.default_audio_format {
            self.default_audio_format = v;
        }
        if let Some(v) = p.default_container {
            self.default_container = v;
        }
        if let Some(v) = p.sub_langs {
            self.sub_langs = v;
        }
        if let Some(v) = p.cookies_browser {
            self.cookies_browser = v;
        }
        if let Some(v) = p.cookies_file {
            self.cookies_file = v;
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum JobStatus {
    Queued,
    Downloading,
    Processing,
    Paused,
    Completed,
    Error,
    Canceled,
}

impl JobStatus {
    pub fn is_active(self) -> bool {
        matches!(self, JobStatus::Downloading | JobStatus::Processing)
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadJob {
    pub id: String,
    pub url: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail: Option<String>,
    pub options: DownloadOptions,
    pub status: JobStatus,
    pub percent: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speed: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eta: Option<String>,
    pub downloaded_bytes: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub added_at: u64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewDownloadItem {
    pub url: String,
    pub title: String,
    pub thumbnail: Option<String>,
    pub options: DownloadOptions,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryItem {
    pub id: String,
    pub title: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail: Option<String>,
    pub format: String,
    pub downloaded_at: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistEntry {
    pub id: String,
    pub title: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub url: String,
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uploader: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extractor: Option<String>,
    pub is_playlist: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entries: Option<Vec<PlaylistEntry>>,
    pub heights: Vec<u32>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisResult {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub info: Option<VideoInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BinaryStatus {
    pub ytdlp: bool,
    pub ffmpeg: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ytdlp_version: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BinaryProgress {
    pub component: String,
    pub percent: u32,
    pub stage: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ScheduledStatus {
    Pending,
    Started,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledItem {
    pub id: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    pub options: DownloadOptions,
    pub run_at: u64,
    pub status: ScheduledStatus,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewScheduledItem {
    pub url: String,
    pub title: Option<String>,
    pub options: DownloadOptions,
    pub run_at: u64,
}

pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
