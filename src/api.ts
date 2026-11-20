import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { openPath, openUrl, revealItemInDir } from '@tauri-apps/plugin-opener'
import type {
  AnalysisResult,
  BinaryProgress,
  BinaryStatus,
  DownloadJob,
  HistoryItem,
  NewDownloadItem,
  NewScheduledItem,
  ScheduledItem,
  Settings
} from './types'

function subscribe<T>(event: string) {
  return (cb: (payload: T) => void): (() => void) => {
    let unlisten: (() => void) | undefined
    let cancelled = false
    listen<T>(event, (e) => cb(e.payload))
      .then((u) => {
        if (cancelled) u()
        else unlisten = u
      })
      .catch((err) => console.error(`listen(${event}) failed:`, err))
    return () => {
      cancelled = true
      unlisten?.()
    }
  }
}

export const api = {
  fetchInfo: (url: string) => invoke<AnalysisResult>('fetch_info', { url }),
  startDownload: (items: NewDownloadItem[]) => invoke<DownloadJob[]>('start_download', { items }),
  pauseDownload: (id: string) => invoke<void>('pause_download', { id }),
  resumeDownload: (id: string) => invoke<void>('resume_download', { id }),
  cancelDownload: (id: string) => invoke<void>('cancel_download', { id }),
  removeJob: (id: string) => invoke<void>('remove_job', { id }),
  retryJob: (id: string) => invoke<void>('retry_job', { id }),
  getQueue: () => invoke<DownloadJob[]>('get_queue'),
  getHistory: () => invoke<HistoryItem[]>('get_history'),
  clearHistory: () => invoke<void>('clear_history'),
  getSettings: () => invoke<Settings>('get_settings'),
  setSettings: (patch: Partial<Settings>) => invoke<Settings>('set_settings', { patch }),
  getBinaryStatus: () => invoke<BinaryStatus>('get_binary_status'),
  installBinaries: () => invoke<BinaryStatus>('install_binaries'),
  getScheduled: () => invoke<ScheduledItem[]>('get_scheduled'),
  addScheduled: (item: NewScheduledItem) => invoke<ScheduledItem[]>('add_scheduled', { item }),
  removeScheduled: (id: string) => invoke<ScheduledItem[]>('remove_scheduled', { id }),

  openPath: (p: string) => openPath(p),
  showInFolder: (p: string) => revealItemInDir(p),
  openExternal: (url: string) => openUrl(url),
  pickDownloadDir: async (): Promise<string | null> => {
    const r = await openDialog({ directory: true, multiple: false, title: 'Choose download folder' })
    return typeof r === 'string' ? r : null
  },
  pickCookiesFile: async (): Promise<string | null> => {
    const r = await openDialog({
      directory: false,
      multiple: false,
      title: 'Choose cookies.txt file',
      filters: [{ name: 'Cookies', extensions: ['txt'] }]
    })
    return typeof r === 'string' ? r : null
  },

  onQueueChanged: subscribe<DownloadJob[]>('queue:changed'),
  onProgress: subscribe<DownloadJob>('download:progress'),
  onBinariesProgress: subscribe<BinaryProgress>('binaries:progress')
}

export type Api = typeof api
