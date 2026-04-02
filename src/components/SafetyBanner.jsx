import { useState } from 'react'

const KEY = 'iwt_safety_dismissed'

export default function SafetyBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(KEY) === '1'
  )

  if (dismissed) return null

  return (
    <div className="flex items-center gap-2.5 px-4 py-2"
      style={{ background: 'rgba(127,29,29,0.5)', borderBottom: '1px solid rgba(185,28,28,0.4)' }}>
      <span className="text-sm shrink-0">🚫</span>
      <p className="flex-1 text-red-300 text-xs font-bold leading-tight">
        Do not use while driving!
      </p>
      <button
        onClick={() => { sessionStorage.setItem(KEY, '1'); setDismissed(true) }}
        className="text-red-400/50 hover:text-red-300 transition-colors leading-none shrink-0 px-1 text-base"
        aria-label="Dismiss warning"
      >
        ✕
      </button>
    </div>
  )
}
