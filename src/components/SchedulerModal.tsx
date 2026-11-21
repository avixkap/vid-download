import { type JSX, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import type { Quality } from '../types'
import { defaultOptions, formatCountdown } from '../utils'
import Modal from './Modal'

function toLocalInputValue(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SchedulerModal(): JSX.Element {
  const { schedulerOpen, setSchedulerOpen, scheduled, setScheduled, settings } = useStore()
  const [url, setUrl] = useState('')
  const [when, setWhen] = useState(() => toLocalInputValue(new Date(Date.now() + 3600_000)))
  const [quality, setQuality] = useState<Quality>('best')
  const [audioOnly, setAudioOnly] = useState(false)

  const add = async (): Promise<void> => {
    const runAt = new Date(when).getTime()
    if (!/^https?:\/\/.+/i.test(url.trim()) || !Number.isFinite(runAt) || !settings) return
    const opts = { ...defaultOptions(settings), quality, audioOnly }
    setScheduled(await api.addScheduled({ url: url.trim(), options: opts, runAt }))
    setUrl('')
  }

  const pending = scheduled.filter((s) => s.status === 'pending')

  return (
    <Modal title="Scheduler" open={schedulerOpen} onClose={() => setSchedulerOpen(false)} wide>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <span className="label">URL</span>
            <input className="input num" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div>
            <span className="label">When</span>
            <input className="input num w-auto" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div>
            <span className="label">Quality</span>
            <select className="input w-auto" value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
              <option value="best">Best</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 pb-2.5 text-xs text-neutral-400">
            <input type="checkbox" className="accent-[#ffb224]" checked={audioOnly} onChange={(e) => setAudioOnly(e.target.checked)} />
            Audio only
          </label>
          <button className="btn-amber" onClick={add} disabled={!/^https?:\/\/.+/i.test(url.trim())}>
            Schedule
          </button>
        </div>

        {pending.length === 0 ? (
          <p className="py-6 text-center font-mono text-xs uppercase tracking-widest text-neutral-600">
            No scheduled downloads
          </p>
        ) : (
          <div className="divide-y divide-deck-700 border border-deck-700">
            {pending.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-300">{s.title ?? s.url}</p>
                  <p className="num text-[11px] text-neutral-600">
                    {new Date(s.runAt).toLocaleString()} ({formatCountdown(s.runAt)}) ·{' '}
                    {s.options.audioOnly ? s.options.audioFormat.toUpperCase() : s.options.quality}
                  </p>
                </div>
                <button className="btn-ghost shrink-0 px-3 py-1 text-xs" onClick={async () => setScheduled(await api.removeScheduled(s.id))}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-neutral-600">
          Scheduled downloads start automatically while the app is running. Missed times fire on next launch.
        </p>
      </div>
    </Modal>
  )
}
