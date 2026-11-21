import { type JSX, useMemo, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import type { DownloadOptions, Quality, VideoInfo } from '../types'
import { cx, defaultOptions, formatDuration } from '../utils'

const ALL_QUALITIES: { value: Quality; label: string; minHeight?: number }[] = [
  { value: 'best', label: 'Best available' },
  { value: '2160', label: '4K / 2160p', minHeight: 1441 },
  { value: '1440', label: '1440p', minHeight: 1081 },
  { value: '1080', label: '1080p', minHeight: 721 },
  { value: '720', label: '720p', minHeight: 481 },
  { value: '480', label: '480p', minHeight: 361 },
  { value: '360', label: '360p', minHeight: 1 },
  { value: 'worst', label: 'Smallest size' }
]

export default function AnalyzeCard({ info, onRemove }: { info: VideoInfo; onRemove: () => void }): JSX.Element {
  const { settings, setJobs } = useStore()
  const [opts, setOpts] = useState<DownloadOptions>(() => defaultOptions(settings!))
  const [jobId, setJobId] = useState<string | null>(null)
  const job = useStore((s) => (jobId ? s.jobs.find((j) => j.id === jobId) : undefined))
  const [showEntries, setShowEntries] = useState(false)

  const qualities = useMemo(() => {
    if (info.isPlaylist || info.heights.length === 0) return ALL_QUALITIES
    const max = info.heights[0]
    return ALL_QUALITIES.filter((q) => q.minHeight === undefined || max >= q.minHeight)
  }, [info])

  const patch = (p: Partial<DownloadOptions>): void => setOpts((o) => ({ ...o, ...p }))

  const add = async (): Promise<void> => {
    const created = await api.startDownload([
      {
        url: info.url,
        title: info.title,
        thumbnail: info.thumbnail,
        options: { ...opts, playlist: info.isPlaylist ? opts.playlist : false }
      }
    ])
    setJobId(created[0]?.id ?? null)
    setJobs(await api.getQueue())
  }

  const buttonLabel = (): string => {
    if (!jobId) return info.isPlaylist && opts.playlist ? `Download all (${info.entries?.length ?? '?'})` : 'Download'
    switch (job?.status) {
      case 'downloading':
        return `${(job.percent ?? 0).toFixed(0)}%`
      case 'processing':
        return 'Converting'
      case 'completed':
        return 'Done ✓'
      case 'error':
        return 'Failed'
      case 'paused':
        return 'Paused'
      case 'canceled':
        return 'Canceled'
      default:
        return 'Queued'
    }
  }

  return (
    <div className="card flex gap-4 p-4">
      {info.thumbnail ? (
        <img src={info.thumbnail} alt="" className="h-24 w-40 shrink-0 rounded-sm border border-deck-700 object-cover" />
      ) : (
        <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-sm border border-deck-700 bg-deck-850 text-neutral-600">
          {info.isPlaylist ? <ListIcon /> : <FilmIcon />}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white" title={info.title}>
              {info.title}
            </h3>
            <p className="num mt-0.5 text-[11px] uppercase tracking-wide text-neutral-500">
              {[
                info.extractor,
                info.uploader,
                info.isPlaylist ? `${info.entries?.length ?? 0} videos` : formatDuration(info.duration)
              ]
                .filter(Boolean)
                .join(' / ')}
            </p>
          </div>
          <button className="btn-icon shrink-0" onClick={onRemove} title="Dismiss">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {info.isPlaylist && (
          <div>
            <button className="font-mono text-[11px] uppercase tracking-wider text-signal hover:underline" onClick={() => setShowEntries((v) => !v)}>
              {showEntries ? '[-] hide entries' : '[+] show entries'}
            </button>
            {showEntries && (
              <ul className="num mt-1.5 max-h-32 overflow-y-auto border border-deck-700 bg-deck-950 p-2 text-xs text-neutral-400">
                {(info.entries ?? []).map((e, i) => (
                  <li key={e.id || i} className="flex gap-2 py-0.5">
                    <span className="w-8 shrink-0 text-right text-neutral-600">{String(i + 1).padStart(2, '0')}</span>
                    <span className="truncate">{e.title}</span>
                    <span className="ml-auto shrink-0 text-neutral-600">{formatDuration(e.duration)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <span className="label">Mode</span>
            <div className="flex border border-deck-600">
              <button
                className={cx(
                  'px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  !opts.audioOnly ? 'bg-signal text-black' : 'bg-deck-900 text-neutral-500 hover:text-white'
                )}
                onClick={() => patch({ audioOnly: false })}
              >
                Video
              </button>
              <button
                className={cx(
                  'border-l border-deck-600 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  opts.audioOnly ? 'bg-signal text-black' : 'bg-deck-900 text-neutral-500 hover:text-white'
                )}
                onClick={() => patch({ audioOnly: true })}
              >
                Audio
              </button>
            </div>
          </div>

          {opts.audioOnly ? (
            <div>
              <span className="label">Format</span>
              <select
                className="input w-auto py-1.5"
                value={opts.audioFormat}
                onChange={(e) => patch({ audioFormat: e.target.value as DownloadOptions['audioFormat'] })}
              >
                <option value="mp3">MP3</option>
                <option value="m4a">M4A</option>
                <option value="opus">Opus</option>
              </select>
            </div>
          ) : (
            <>
              <div>
                <span className="label">Quality</span>
                <select className="input w-auto py-1.5" value={opts.quality} onChange={(e) => patch({ quality: e.target.value as Quality })}>
                  {qualities.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="label">Container</span>
                <select
                  className="input w-auto py-1.5"
                  value={opts.container}
                  onChange={(e) => patch({ container: e.target.value as DownloadOptions['container'] })}
                >
                  <option value="mp4">MP4</option>
                  <option value="mkv">MKV</option>
                  <option value="webm">WebM</option>
                  <option value="any">Original</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 pb-2 text-xs text-neutral-400">
                <input type="checkbox" className="accent-[#ffb224]" checked={opts.subtitles} onChange={(e) => patch({ subtitles: e.target.checked })} />
                Subtitles
              </label>
            </>
          )}

          <button
            className={cx('btn-amber num ml-auto min-w-[7rem]', job?.status === 'error' && 'bg-red-400 hover:bg-red-400')}
            onClick={add}
            disabled={!!jobId}
          >
            {buttonLabel()}
          </button>
        </div>
      </div>
    </div>
  )
}

function FilmIcon(): JSX.Element {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20" rx="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function ListIcon(): JSX.Element {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}
