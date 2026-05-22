import { useState, useEffect, useRef } from 'react'

export default function SplashScreen({ onComplete }) {
  // in → hold → out → gone
  const [phase, setPhase]       = useState('in')
  const [imgError, setImgError] = useState(false)

  // Keep a stable ref to onComplete so App re-renders don't restart timers
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete })

  // Run once — never re-run even if parent re-renders
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('out'),  2100)
    const t3 = setTimeout(() => {
      setPhase('gone')
      onCompleteRef.current?.()
    }, 2900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'gone') return null

  const isOut = phase === 'out'

  return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 200, pointerEvents: isOut ? 'none' : 'all' }}>

      {/* Background */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, #0d1f3c 0%, #04080f 75%)',
        opacity: isOut ? 0 : 1,
        transition: isOut ? 'opacity 0.8s ease' : 'opacity 0.5s ease',
      }} />

      {/* Logo / fallback */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        opacity: phase === 'in' ? 0 : isOut ? 0 : 1,
        transform: phase === 'in' ? 'scale(0.88)' : 'scale(1)',
        transition: phase === 'in'
          ? 'opacity 0.55s ease, transform 0.55s cubic-bezier(0.34,1.56,0.64,1)'
          : isOut
          ? 'opacity 0.75s ease'
          : undefined,
      }}>
        {!imgError ? (
          <img
            src="/logo-tag.png"
            alt="Tag Wizard"
            style={{ maxHeight: '220px', maxWidth: '85vw', width: 'auto', height: 'auto', display: 'block' }}
            onError={() => setImgError(true)}
          />
        ) : (
          /* Text fallback when image fails to load */
          <div className="text-center px-8">
            <div className="text-6xl mb-3">🏷️</div>
            <div className="flex items-baseline gap-2 justify-center select-none">
              <span className="text-white font-extrabold text-4xl tracking-tight">Tag</span>
              <span className="font-black text-5xl tracking-widest"
                style={{ color: '#f59e0b', textShadow: '0 0 24px rgba(245,158,11,0.6)' }}>
                WIZARD
              </span>
            </div>
          </div>
        )}

        <p className="text-center text-xs font-bold tracking-[0.2em] uppercase mt-5 select-none"
          style={{ color: '#f59e0b', letterSpacing: '0.22em' }}>
          Spot&nbsp;·&nbsp;Decode It&nbsp;·&nbsp;Collect All 51 States
        </p>
      </div>
    </div>
  )
}
