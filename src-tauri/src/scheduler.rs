use crate::models::{now_ms, NewDownloadItem, ScheduledStatus};
use crate::state::AppState;
use crate::{queue, store};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};

const TICK: Duration = Duration::from_secs(5);
const DAY_MS: u64 = 86_400_000;

pub fn start(app: AppHandle) {
    thread::spawn(move || loop {
        tick(&app);
        thread::sleep(TICK);
    });
}

fn tick(app: &AppHandle) {
    let state = app.state::<AppState>();
    let mut fired = Vec::new();
    {
        let mut items = state.scheduled.lock().unwrap();
        let now = now_ms();
        let mut changed = false;
        for item in items.iter_mut() {
            if item.status == ScheduledStatus::Pending && item.run_at <= now {
                item.status = ScheduledStatus::Started;
                fired.push(item.clone());
                changed = true;
            }
        }
        let before = items.len();
        items.retain(|i| {
            i.status == ScheduledStatus::Pending || now.saturating_sub(i.run_at) < DAY_MS
        });
        if changed || items.len() != before {
            store::save_scheduled(&state.data_dir, &items);
        }
    }
    for item in fired {
        queue::add_items(
            &state,
            vec![NewDownloadItem {
                url: item.url.clone(),
                title: item.title.clone().unwrap_or_else(|| item.url.clone()),
                thumbnail: None,
                options: item.options.clone(),
            }],
        );
    }
}
