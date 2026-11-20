export type Quality = 'best' | '2160' | '1440' | '1080' | '720' | '480' | '360' | 'worst'
export type ContainerFormat = 'mp4' | 'mkv' | 'webm' | 'any'
export type AudioFormat = 'mp3' | 'm4a' | 'opus'

export interface DownloadOptions {
  quality: Quality
  audioOnly: boolean
  audioFormat: AudioFormat
  container: ContainerFormat
  subtitles: boolean
  subLangs: string
  embedSubs: boolean
  playlist: boolean
}

export interface PlaylistEntry {
  id: string
  title: string
  url: string
  duration?: number
  thumbnail?: string
}

export interface VideoInfo {
  url: string
  id: string
  title: string
  thumbnail?: string
  duration?: number
  uploader?: string
  extractor?: string
  isPlaylist: boolean
  entries?: PlaylistEntry[]
  heights: number[]
}

export interface AnalysisResult {
  url: string
  info?: VideoInfo
  error?: string
}

export type JobStatus =
  | 'queued'
  | 'downloading'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'error'
  | 'canceled'

export interface DownloadJob {
  id: string
  url: string
  title: string
  thumbnail?: string
  options: DownloadOptions
  status: JobStatus
  percent: number
  speed?: string
  eta?: string
  downloadedBytes: number
  totalBytes?: number
  filePath?: string
  error?: string
  addedAt: number
}

export interface NewDownloadItem {
  url: string
  title: string
  thumbnail?: string
  options: DownloadOptions
}

export interface HistoryItem {
  id: string
  title: string
  url: string
  filePath?: string
  thumbnail?: string
  format: string
  downloadedAt: number
}

export type CookiesBrowser = '' | 'chrome' | 'edge' | 'firefox' | 'brave' | 'opera' | 'vivaldi'

export interface Settings {
  downloadDir: string
  concurrency: number
  defaultQuality: Quality
  defaultAudioOnly: boolean
  defaultAudioFormat: AudioFormat
  defaultContainer: ContainerFormat
  subLangs: string
  cookiesBrowser: CookiesBrowser
  cookiesFile: string
}

export interface BinaryStatus {
  ytdlp: boolean
  ffmpeg: boolean
  ytdlpVersion?: string
}

export interface BinaryProgress {
  component: string
  percent: number
  stage: string
}

export interface ScheduledItem {
  id: string
  url: string
  title?: string
  options: DownloadOptions
  runAt: number
  status: 'pending' | 'started'
}

export interface NewScheduledItem {
  url: string
  title?: string
  options: DownloadOptions
  runAt: number
}
