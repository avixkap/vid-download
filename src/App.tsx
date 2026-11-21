import { type JSX, useEffect, useRef } from 'react'
import { api } from './api'
import { useStore } from './store'
import Hero from './components/Hero'
import BinaryBanner from './components/BinaryBanner'
import AnalyzeCard from './components/AnalyzeCard'
import DownloadsSection from './components/DownloadsSection'
import HistorySection from './components/HistorySection'
import SchedulerModal from './components/SchedulerModal'
import SettingsModal from './components/SettingsModal'
import Toasts from './components/Toasts'

export default function App(): JSX.Element {
  const {
    setJobs,
    patchJob,
    setHistory,
    setSettings,
    setBinaries,
    setBinProgress,
    setScheduled,
    analyses,
    setAnalyses,
    jobs,
    pushToast,
    setSchedulerOpen,
    setSettingsOpen
  } = useStore()

  useEffect(() => {
    api.getQueue().then(setJobs)
    api.getHistory().then(setHistory)
    api.getSettings().then(setSettings)
    api.getBinaryStatus().then(setBinaries)
    api.getScheduled().then(setScheduled)

    const offQueue = api.onQueueChanged(setJobs)
    const offProgress = api.onProgress(patchJob)
    const offBins = api.onBinariesProgress(setBinProgress)
    return () => {
      offQueue()
      offProgress()
      offBins()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Toast + history refresh on job completion/failure
  const prevStatuses = useRef<Record<string, string>>({})
  useEffect(() => {
    const prev = prevStatuses.current
    const next: Record<string, string> = {}
    let completedChanged = false
    for (const j of jobs) {
      next[j.id] = j.status
      const p = prev[j.id]
      if (p && p !== j.status) {
        if (j.status === 'completed') {
          pushToast({ kind: 'done', title: j.title, sub: j.filePath ?? undefined, filePath: j.filePath ?? undefined })
          completedChanged = true
        } else if (j.status === 'error') {
          pushToast({ kind: 'error', title: j.title, sub: j.error ?? undefined })
        }
      }
    }
    prevStatuses.current = next
    if (completedChanged) api.getHistory().then(setHistory)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs])

  const removeAnalysis = (idx: number): void => {
    setAnalyses(useStore.getState().analyses.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-deck-700 bg-deck-950/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-signal text-black">
            <DownloadIcon className="h-4 w-4" />
          </div>
          <h1 className="font-display text-sm font-bold uppercase tracking-[0.22em] text-white">
            VidDownload<span className="text-signal">.</span>
          </h1>
        </div>
        <span className="ml-2 hidden font-mono text-[10px] uppercase tracking-widest text-neutral-600 sm:inline">
          yt-dlp front-end
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn-icon" title="Scheduler" onClick={() => setSchedulerOpen(true)}>
            <ClockIcon />
          </button>
          <button className="btn-icon" title="Settings" onClick={() => setSettingsOpen(true)}>
            <CogIcon />
          </button>
        </div>
      </header>

      <BinaryBanner />
      <Hero />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16">
        {analyses.length > 0 && (
          <section className="mt-2 flex flex-col gap-3">
            <div className="flex items-center gap-3 border-b border-deck-700 pb-2">
              <h2 className="section-title">
                Ready <span className="text-signal">/</span> {analyses.filter((a) => a.info).length}
              </h2>
              <button className="btn-ghost ml-auto px-3 py-1 text-xs" onClick={() => setAnalyses([])}>
                Clear all
              </button>
            </div>
            {analyses.map((a, i) =>
              a.info ? (
                <AnalyzeCard key={`${a.url}-${i}`} info={a.info} onRemove={() => removeAnalysis(i)} />
              ) : (
                <div key={`${a.url}-${i}`} className="card flex items-center gap-3 border-red-500/40 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="num truncate text-xs text-neutral-400">{a.url}</p>
                    <p className="mt-0.5 text-xs text-red-400">{a.error}</p>
                  </div>
                  <button className="btn-icon shrink-0" onClick={() => removeAnalysis(i)} title="Dismiss">
                    <XIcon />
                  </button>
                </div>
              )
            )}
          </section>
        )}

        <DownloadsSection />
        <HistorySection />
      </main>

      <footer className="border-t border-deck-700 px-5 py-3 text-center font-mono text-[10px] uppercase tracking-widest text-neutral-600">
        VidDownload — powered by yt-dlp — download responsibly
      </footer>

      <SchedulerModal />
      <SettingsModal />
      <Toasts />
    </div>
  )
}

export function DownloadIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function ClockIcon(): JSX.Element {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function CogIcon(): JSX.Element {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
