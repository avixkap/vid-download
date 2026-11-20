import { useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { cx } from '../utils'

export default function HistorySection(): JSX.Element {
  const { history, setHistory } = useStore()
  const [open, setOpen] = useState(true)

  return (
    <section className="mt-8 flex flex-col gap-3">
      <div className="flex items-center gap-3 border-b border-deck-700 pb-2">
        <button className="section-title flex items-center gap-2 hover:text-neutral-300" onClick={() => setOpen((v) => !v)}>
          <svg className={cx('h-3 w-3 transition-transform', open && 'rotate-90')} viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
          </svg>
          History <span className="text-signal">/</span> {history.length}
        </button>
        {open && history.length > 0 && (
          <button
            className="btn-ghost ml-auto px-3 py-1 text-xs"
            onClick={async () => {
              if (confirm('Clear download history? (files are kept)')) {
                await api.clearHistory()
                setHistory([])
              }
            }}
          >
            Clear history
          </button>
        )}
      </div>

      {open &&
        (history.length === 0 ? (
          <p className="border border-dashed border-deck-700 px-4 py-6 text-center font-mono text-[11px] uppercase tracking-widest text-neutral-600">
            No completed downloads yet
          </p>
        ) : (
          <div className="card divide-y divide-deck-700">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                {h.thumbnail ? (
                  <img src={h.thumbnail} alt="" className="h-9 w-14 shrink-0 rounded-sm border border-deck-700 object-cover" />
                ) : (
                  <div className="h-9 w-14 shrink-0 rounded-sm border border-deck-700 bg-deck-850" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-300">{h.title}</p>
                  <p className="num text-[11px] text-neutral-600">
                    {new Date(h.downloadedAt).toLocaleString()} · {h.format.toUpperCase()}
                  </p>
                </div>
                <button className="btn-ghost shrink-0 px-3 py-1 text-xs" onClick={() => api.openExternal(h.url)}>
                  Source
                </button>
                {h.filePath && (
                  <>
                    <button className="btn-ghost shrink-0 px-3 py-1 text-xs" onClick={() => api.openPath(h.filePath!)}>
                      Play
                    </button>
                    <button className="btn-ghost shrink-0 px-3 py-1 text-xs" onClick={() => api.showInFolder(h.filePath!)}>
                      Folder
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
    </section>
  )
}
