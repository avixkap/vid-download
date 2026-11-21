import type { JSX } from 'react'
import { api } from '../api'
import { useStore } from '../store'

export default function BinaryBanner(): JSX.Element | null {
  const { binaries, binProgress, installingBins, setBinaries, setBinProgress, setInstallingBins } = useStore()

  if (!binaries || (binaries.ytdlp && binaries.ffmpeg)) return null

  const install = async (): Promise<void> => {
    setInstallingBins(true)
    setBinProgress(null)
    try {
      const status = await api.installBinaries()
      setBinaries(status)
    } catch (e) {
      alert(`Failed to install components: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setInstallingBins(false)
      setBinProgress(null)
    }
  }

  return (
    <div className="border-b border-signal/30 bg-signal-dim px-5 py-3">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <span className="text-signal">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-signal">Required components missing</p>
          <p className="text-xs text-neutral-400">
            VidDownload needs yt-dlp{!binaries.ffmpeg ? ' and ffmpeg' : ''} — one-time download, ~85 MB.
          </p>
        </div>
        {installingBins ? (
          <div className="flex w-64 flex-col gap-1">
            <div className="h-1 overflow-hidden bg-deck-700">
              <div className="h-full bg-signal transition-all" style={{ width: `${binProgress?.percent ?? 0}%` }} />
            </div>
            <span className="num text-[11px] text-neutral-400">
              {binProgress?.stage ?? 'Starting…'} {binProgress ? `${binProgress.percent}%` : ''}
            </span>
          </div>
        ) : (
          <button className="btn-amber" onClick={install}>
            Install components
          </button>
        )}
      </div>
    </div>
  )
}
