import { type JSX, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { cx } from '../utils'

const SITE_CHIPS = ['YouTube', 'TikTok', 'X', 'Instagram', 'Vimeo', 'Twitch', 'Reddit', 'Facebook', 'Dailymotion', '+1000']

export default function Hero(): JSX.Element {
  const { analyses, analyzing, analyzeProgress, setAnalyses, setAnalyzing, setAnalyzeProgress, binaries, jobs } =
    useStore()
  const [text, setText] = useState('')

  const centered = analyses.length === 0 && jobs.length === 0 && !analyzing

  const urls = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\/.+/i.test(l))

  const analyze = async (): Promise<void> => {
    if (urls.length === 0 || analyzing) return
    setAnalyzing(true)
    setAnalyses([])
    setAnalyzeProgress({ done: 0, total: urls.length })
    for (let i = 0; i < urls.length; i++) {
      const result = await api.fetchInfo(urls[i])
      setAnalyses([...useStore.getState().analyses, result])
      setAnalyzeProgress({ done: i + 1, total: urls.length })
    }
    setAnalyzing(false)
    setText('')
  }

  const paste = async (): Promise<void> => {
    try {
      const clip = await navigator.clipboard.readText()
      if (clip) setText((t) => (t ? `${t}\n${clip.trim()}` : clip.trim()))
    } catch {
      // clipboard unavailable — user can Ctrl+V
    }
  }

  return (
    <section
      className={cx(
        'mx-auto flex w-full max-w-4xl flex-col items-center px-5 transition-all duration-300',
        centered ? 'justify-center py-20' : 'py-5'
      )}
    >
      {centered && (
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            <span className="h-px w-8 bg-deck-600" />
            video · audio · playlists
            <span className="h-px w-8 bg-deck-600" />
          </div>
          <h2 className="font-display text-5xl font-bold tracking-tight text-white sm:text-7xl">
            DROP A LINK<span className="text-signal">.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-500">
            Paste a URL, pick the quality, hit download. Video or audio-only, single files or entire playlists.
          </p>
        </div>
      )}

      <div className={cx('w-full', centered ? 'max-w-2xl' : '')}>
        <div
          className={cx(
            'card overflow-hidden border-deck-600 transition-colors',
            centered && 'focus-within:border-signal/60'
          )}
        >
          <textarea
            className={cx(
              'num w-full resize-y border-0 bg-transparent px-4 py-3 text-[13px] text-neutral-200 placeholder-neutral-600 outline-none',
              centered ? 'min-h-[96px]' : 'min-h-[56px]'
            )}
            placeholder="https:// — paste video or playlist links, one per line"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analyze()
            }}
            rows={centered ? 3 : Math.min(4, Math.max(2, text.split('\n').length))}
          />
          <div className="flex items-center gap-2 border-t border-deck-700 px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
              {urls.length > 0 ? `${urls.length} link${urls.length > 1 ? 's' : ''}` : 'ctrl+enter'}
            </span>
            <div className="ml-auto flex gap-2">
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={paste}>
                Paste
              </button>
              <button
                className="btn-accent px-6 py-1.5 text-xs"
                onClick={analyze}
                disabled={urls.length === 0 || analyzing || !binaries?.ytdlp}
              >
                {analyzing && analyzeProgress ? `Analyzing ${analyzeProgress.done}/${analyzeProgress.total}` : 'Analyze'}
              </button>
            </div>
          </div>
        </div>

        {centered && (
          <div className="mt-7 flex flex-wrap justify-center gap-1.5">
            {SITE_CHIPS.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
