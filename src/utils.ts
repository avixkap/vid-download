import type { DownloadOptions, Settings } from './types'

export function formatBytes(n?: number): string {
  if (n === undefined || !Number.isFinite(n)) return '—'
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n
  let i = -1
  do {
    v /= 1024
    i++
  } while (v >= 1024 && i < units.length - 1)
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`
}

export function formatDuration(sec?: number): string {
  if (sec === undefined || !Number.isFinite(sec)) return '—'
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`
}

// yt-dlp's progress template reports raw bytes/sec and seconds
export function formatSpeed(speed?: string): string {
  const n = Number(speed)
  return Number.isFinite(n) ? `${formatBytes(Math.round(n))}/s` : `${speed}/s`
}

export function formatEta(eta?: string): string {
  const n = Number(eta)
  return Number.isFinite(n) ? formatDuration(n) : String(eta)
}

export function formatCountdown(runAt: number): string {
  const diff = runAt - Date.now()
  if (diff <= 0) return 'starting…'
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `in ${d}d ${h % 24}h`
  if (h > 0) return `in ${h}h ${m % 60}m`
  if (m > 0) return `in ${m}m`
  return `in ${Math.max(1, Math.round(diff / 1000))}s`
}

export function defaultOptions(s: Settings): DownloadOptions {
  return {
    quality: s.defaultQuality,
    audioOnly: s.defaultAudioOnly,
    audioFormat: s.defaultAudioFormat,
    container: s.defaultContainer,
    subtitles: false,
    subLangs: s.subLangs,
    embedSubs: true,
    playlist: true
  }
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
