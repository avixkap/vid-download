import type { JSX, ReactNode } from 'react'

export default function Modal({
  title,
  open,
  onClose,
  children,
  wide
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  wide?: boolean
}): JSX.Element | null {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`card my-8 w-full border-deck-600 ${wide ? 'max-w-3xl' : 'max-w-xl'} p-5`}>
        <div className="mb-4 flex items-center justify-between border-b border-deck-700 pb-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-white">
            {title}
            <span className="text-signal">.</span>
          </h2>
          <button className="btn-icon" onClick={onClose} title="Close">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
