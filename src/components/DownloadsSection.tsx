import { api } from '../api'
import { useStore } from '../store'
import type { DownloadJob } from '../types'
import { cx, formatBytes, formatEta, formatSpeed } from '../utils'

const STATUS_LABEL: Record<DownloadJob['status'], string> = {
  queued: 'QUEUED',
  downloading: 'DOWNLOADING',
  processing: 'CONVERTING',
  paused: 'PAUSED',
  completed: 'DONE',
  error: 'FAILED',
  canceled: 'CANCELED'
}

export default function DownloadsSection(): JSX.Element | null {
  const { jobs } = useStore()
  if (jobs.length === 0) return null

  return (
    <section className="mt-8 flex flex-col gap-3">
      <h2 className="section-title border-b border-deck-700 pb-2">
        Queue <span className="text-signal">/</span> {jobs.length}
      </h2>
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} />
      ))}
    </section>
  )
}

function JobRow({ job }: { job: DownloadJob }): JSX.Element {
  const active = job.status === 'downloading' || job.status === 'processing'

  return (
    <div className="card flex items-center gap-3.5 p-3.5">
      {job.thumbnail ? (
        <img src={job.thumbnail} alt="" className="h-14 w-24 shrink-0 rounded-sm border border-deck-700 object-cover" />
      ) : (
        <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-sm border border-deck-700 bg-deck-850 text-neutral-600">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-200" title={job.title}>
            {job.title}
          </p>
          <span
            className={cx(
              'num shrink-0 text-[10px] font-semibold uppercase tracking-wider',
              job.status === 'completed' && 'text-emerald-400',
              active && 'text-signal',
              job.status === 'error' && 'text-red-400',
              (job.status === 'queued' || job.status === 'paused' || job.status === 'canceled') && 'text-neutral-500'
            )}
          >
            {active && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-signal align-middle" />}
            {STATUS_LABEL[job.status]}
          </span>
          {job.options.audioOnly && (
            <span className="chip shrink-0">{job.options.audioFormat}</span>
          )}
        </div>

        {active || job.status === 'paused' ? (
          <>
            <div className="h-1.5 overflow-hidden bg-deck-700">
              <div
                className={cx('h-full transition-all', job.status === 'paused' ? 'bg-neutral-500' : 'bg-signal')}
                style={{ width: `${job.percent}%` }}
              />
            </div>
            <div className="num flex gap-4 text-[11px] text-neutral-500">
              <span className="text-neutral-300">{job.percent.toFixed(1)}%</span>
              <span>
                {formatBytes(job.downloadedBytes)} / {formatBytes(job.totalBytes)}
              </span>
              {job.speed && <span>{formatSpeed(job.speed)}</span>}
              {job.eta && <span>ETA {formatEta(job.eta)}</span>}
            </div>
          </>
        ) : job.status === 'error' ? (
          <p className="truncate text-xs text-red-400/90" title={job.error}>
            {job.error}
          </p>
        ) : job.status === 'completed' && job.filePath ? (
          <p className="num truncate text-[11px] text-neutral-600" title={job.filePath}>
            {job.filePath}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {active ? (
          <button className="btn-icon" title="Pause" onClick={() => api.pauseDownload(job.id)}>
            <PauseIcon />
          </button>
        ) : job.status === 'paused' ? (
          <button className="btn-icon" title="Resume" onClick={() => api.resumeDownload(job.id)}>
            <PlayIcon />
          </button>
        ) : null}
        {job.status === 'error' || job.status === 'canceled' ? (
          <button className="btn-icon" title="Retry" onClick={() => api.retryJob(job.id)}>
            <RetryIcon />
          </button>
        ) : null}
        {job.status === 'completed' && job.filePath && (
          <>
            <button className="btn-icon" title="Play" onClick={() => api.openPath(job.filePath!)}>
              <PlayIcon />
            </button>
            <button className="btn-icon" title="Show in folder" onClick={() => api.showInFolder(job.filePath!)}>
              <FolderIcon />
            </button>
          </>
        )}
        {job.status !== 'completed' && (
          <button className="btn-icon" title="Cancel" onClick={() => api.cancelDownload(job.id)} disabled={job.status === 'canceled'}>
            <XIcon />
          </button>
        )}
        {(job.status === 'completed' || job.status === 'canceled' || job.status === 'error') && (
          <button className="btn-icon" title="Remove from list" onClick={() => api.removeJob(job.id)}>
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  )
}

function PauseIcon(): JSX.Element {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function PlayIcon(): JSX.Element {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
    </svg>
  )
}

function XIcon(): JSX.Element {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function RetryIcon(): JSX.Element {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

function FolderIcon(): JSX.Element {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function TrashIcon(): JSX.Element {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
