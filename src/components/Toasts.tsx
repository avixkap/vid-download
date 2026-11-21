import { type JSX, useEffect } from 'react'
import { api } from '../api'
import { useStore, type Toast } from '../store'
import { cx } from '../utils'

export default function Toasts(): JSX.Element | null {
  const { toasts } = useStore()
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-96 flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  )
}

function ToastCard({ toast }: { toast: Toast }): JSX.Element {
  const { dismissToast } = useStore()

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), 8000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const done = toast.kind === 'done'

  return (
    <div
      className={cx(
        'card flex items-start gap-3 border-l-2 p-3.5',
        done ? 'border-l-signal' : 'border-l-red-400'
      )}
    >
      <span className={cx('mt-0.5 shrink-0', done ? 'text-signal' : 'text-red-400')}>
        {done ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="section-title">{done ? 'Download complete' : 'Download failed'}</p>
        <p className="mt-1 truncate text-sm text-neutral-200" title={toast.title}>
          {toast.title}
        </p>
        {toast.sub && (
          <p className="num mt-0.5 truncate text-[11px] text-neutral-500" title={toast.sub}>
            {toast.sub}
          </p>
        )}
        {done && toast.filePath && (
          <div className="mt-2 flex gap-2">
            <button className="btn-accent px-3 py-1 text-xs" onClick={() => api.openPath(toast.filePath!)}>
              Play
            </button>
            <button className="btn-ghost px-3 py-1 text-xs" onClick={() => api.showInFolder(toast.filePath!)}>
              Folder
            </button>
          </div>
        )}
      </div>
      <button className="btn-icon h-7 w-7 shrink-0" onClick={() => dismissToast(toast.id)} title="Dismiss">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
