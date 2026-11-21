import type { JSX } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import type { Quality } from '../types'
import Modal from './Modal'

export default function SettingsModal(): JSX.Element {
  const { settingsOpen, setSettingsOpen, settings, setSettings, binaries, setBinaries, setInstallingBins } = useStore()

  if (!settings) return <></>

  const save = async (patch: Partial<typeof settings>): Promise<void> => {
    setSettings(await api.setSettings(patch))
  }

  const pickDir = async (): Promise<void> => {
    const dir = await api.pickDownloadDir()
    if (dir) await save({ downloadDir: dir })
  }

  return (
    <Modal title="Settings" open={settingsOpen} onClose={() => setSettingsOpen(false)} wide>
      <div className="flex flex-col gap-5">
        <div>
          <span className="label">Download folder</span>
          <div className="flex gap-2">
            <input className="input num flex-1" readOnly value={settings.downloadDir} />
            <button className="btn-ghost shrink-0" onClick={pickDir}>
              Browse
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <span className="label">Simultaneous downloads</span>
            <select className="input w-auto" value={settings.concurrency} onChange={(e) => save({ concurrency: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Default quality</span>
            <select className="input w-auto" value={settings.defaultQuality} onChange={(e) => save({ defaultQuality: e.target.value as Quality })}>
              <option value="best">Best available</option>
              <option value="1080">1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
            </select>
          </div>
          <div>
            <span className="label">Default container</span>
            <select
              className="input w-auto"
              value={settings.defaultContainer}
              onChange={(e) => save({ defaultContainer: e.target.value as typeof settings.defaultContainer })}
            >
              <option value="mp4">MP4</option>
              <option value="mkv">MKV</option>
              <option value="webm">WebM</option>
              <option value="any">Original</option>
            </select>
          </div>
          <div>
            <span className="label">Subtitle languages</span>
            <input className="input num w-32" value={settings.subLangs} onChange={(e) => save({ subLangs: e.target.value })} placeholder="en.*" />
          </div>
        </div>

        <div className="border-t border-deck-700 pt-4">
          <h3 className="section-title mb-3">Cookies / login-required sites</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <span className="label">Read cookies from browser</span>
              <select
                className="input w-auto"
                value={settings.cookiesBrowser}
                onChange={(e) => save({ cookiesBrowser: e.target.value as typeof settings.cookiesBrowser })}
              >
                <option value="">Disabled</option>
                <option value="chrome">Chrome</option>
                <option value="edge">Edge</option>
                <option value="firefox">Firefox</option>
                <option value="brave">Brave</option>
                <option value="opera">Opera</option>
                <option value="vivaldi">Vivaldi</option>
              </select>
            </div>
            <div className="min-w-64 flex-1">
              <span className="label">or cookies.txt file (overrides browser)</span>
              <div className="flex gap-2">
                <input className="input num flex-1" readOnly value={settings.cookiesFile} placeholder="No file selected" />
                <button
                  className="btn-ghost shrink-0"
                  onClick={async () => {
                    const f = await api.pickCookiesFile()
                    if (f) await save({ cookiesFile: f })
                  }}
                >
                  Browse
                </button>
                {settings.cookiesFile && (
                  <button className="btn-ghost shrink-0" onClick={() => save({ cookiesFile: '' })}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            If a site says "Sign in to confirm you're not a bot" or needs a login, pick the browser you're signed in
            with. The browser must be fully closed while downloading (Chromium locks its cookie store).
          </p>
        </div>

        <div className="border-t border-deck-700 pt-4">
          <h3 className="section-title mb-3">Components</h3>
          <div className="flex items-center gap-4 text-sm">
            <StatusDot ok={binaries?.ytdlp} label={`yt-dlp ${binaries?.ytdlpVersion ?? ''}`} />
            <StatusDot ok={binaries?.ffmpeg} label="ffmpeg" />
            <button
              className="btn-ghost ml-auto px-3 py-1 text-xs"
              onClick={async () => {
                setInstallingBins(true)
                try {
                  setBinaries(await api.installBinaries())
                } finally {
                  setInstallingBins(false)
                }
              }}
            >
              Re-check / update
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            yt-dlp and ffmpeg are downloaded automatically on first run. To update yt-dlp, delete the bin folder in
            the app data directory and restart.
          </p>
        </div>
      </div>
    </Modal>
  )
}

function StatusDot({ ok, label }: { ok?: boolean; label: string }): JSX.Element {
  return (
    <span className="num flex items-center gap-1.5 text-xs text-neutral-400">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {label}
    </span>
  )
}
