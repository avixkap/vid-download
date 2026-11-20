mod binaries;
mod models;
mod parser;
mod queue;
mod scheduler;
mod state;
mod store;
mod ytdlp;

use models::{
    AnalysisResult, BinaryStatus, DownloadJob, HistoryItem, NewDownloadItem, NewScheduledItem,
    ScheduledItem, ScheduledStatus, Settings, SettingsPatch,
};
use state::AppState;
use tauri::{Manager, State};

#[tauri::command]
async fn fetch_info(state: State<'_, AppState>, url: String) -> Result<AnalysisResult, String> {
    let bin = binaries::bin_dir(&state.data_dir);
    let settings = state.settings.lock().unwrap().clone();
    tauri::async_runtime::spawn_blocking(move || ytdlp::fetch_info(&bin, &settings, &url))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn start_download(state: State<'_, AppState>, items: Vec<NewDownloadItem>) -> Vec<DownloadJob> {
    queue::add_items(&state, items)
}

#[tauri::command]
fn pause_download(state: State<'_, AppState>, id: String) {
    queue::pause(&state, &id)
}

#[tauri::command]
fn resume_download(state: State<'_, AppState>, id: String) {
    queue::resume(&state, &id)
}

#[tauri::command]
fn cancel_download(state: State<'_, AppState>, id: String) {
    queue::cancel(&state, &id)
}

#[tauri::command]
fn remove_job(state: State<'_, AppState>, id: String) {
    queue::remove(&state, &id)
}

#[tauri::command]
fn retry_job(state: State<'_, AppState>, id: String) {
    queue::retry(&state, &id)
}

#[tauri::command]
fn get_queue(state: State<'_, AppState>) -> Vec<DownloadJob> {
    queue::list(&state)
}

#[tauri::command]
fn get_history(state: State<'_, AppState>) -> Vec<HistoryItem> {
    store::list_history(&state.data_dir)
}

#[tauri::command]
fn clear_history(state: State<'_, AppState>) {
    store::clear_history(&state.data_dir)
}

#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn set_settings(state: State<'_, AppState>, patch: SettingsPatch) -> Settings {
    let mut s = state.settings.lock().unwrap();
    s.apply(patch);
    store::save_settings(&state.data_dir, &s);
    s.clone()
}

#[tauri::command]
fn get_binary_status(state: State<'_, AppState>) -> BinaryStatus {
    binaries::status(&state.data_dir)
}

#[tauri::command]
async fn install_binaries(state: State<'_, AppState>) -> Result<BinaryStatus, String> {
    let app = state.app.clone();
    let data_dir = state.data_dir.clone();
    tauri::async_runtime::spawn_blocking(move || binaries::install(&app, &data_dir))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn get_scheduled(state: State<'_, AppState>) -> Vec<ScheduledItem> {
    let mut items = state.scheduled.lock().unwrap().clone();
    items.sort_by_key(|i| i.run_at);
    items
}

#[tauri::command]
fn add_scheduled(state: State<'_, AppState>, item: NewScheduledItem) -> Vec<ScheduledItem> {
    let mut items = state.scheduled.lock().unwrap();
    items.push(ScheduledItem {
        id: uuid::Uuid::new_v4().to_string(),
        url: item.url,
        title: item.title,
        options: item.options,
        run_at: item.run_at,
        status: ScheduledStatus::Pending,
    });
    items.sort_by_key(|i| i.run_at);
    store::save_scheduled(&state.data_dir, &items);
    items.clone()
}

#[tauri::command]
fn remove_scheduled(state: State<'_, AppState>, id: String) -> Vec<ScheduledItem> {
    let mut items = state.scheduled.lock().unwrap();
    items.retain(|i| i.id != id);
    store::save_scheduled(&state.data_dir, &items);
    let mut out = items.clone();
    out.sort_by_key(|i| i.run_at);
    out
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let data_dir = app.path().app_data_dir().expect("no app data dir");
            let _ = std::fs::create_dir_all(&data_dir);
            let settings = store::load_settings(&data_dir);
            let scheduled = store::load_scheduled(&data_dir);
            app.manage(AppState::new(handle.clone(), data_dir, settings, scheduled));
            scheduler::start(handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fetch_info,
            start_download,
            pause_download,
            resume_download,
            cancel_download,
            remove_job,
            retry_job,
            get_queue,
            get_history,
            clear_history,
            get_settings,
            set_settings,
            get_binary_status,
            install_binaries,
            get_scheduled,
            add_scheduled,
            remove_scheduled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
