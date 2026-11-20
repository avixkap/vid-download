use crate::models::{DownloadJob, ScheduledItem, Settings};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Child;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

pub struct AppState {
    pub app: AppHandle,
    pub data_dir: PathBuf,
    pub settings: Mutex<Settings>,
    pub jobs: Mutex<Vec<DownloadJob>>,
    pub procs: Mutex<HashMap<String, Child>>,
    pub stderr_tails: Mutex<HashMap<String, Arc<Mutex<String>>>>,
    pub scheduled: Mutex<Vec<ScheduledItem>>,
}

impl AppState {
    pub fn new(
        app: AppHandle,
        data_dir: PathBuf,
        settings: Settings,
        scheduled: Vec<ScheduledItem>,
    ) -> Self {
        Self {
            app,
            data_dir,
            settings: Mutex::new(settings),
            jobs: Mutex::new(Vec::new()),
            procs: Mutex::new(HashMap::new()),
            stderr_tails: Mutex::new(HashMap::new()),
            scheduled: Mutex::new(scheduled),
        }
    }
}
