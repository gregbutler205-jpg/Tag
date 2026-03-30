import { useState, useEffect } from 'react'

export default function SplashScreen({ onComplete }) {
  // in → hold → out → gone
  const [phase, setPhase] = useState('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)   // fade-in complete
    const t2 = setTimeout(() => setPhase('out'),  2100)  // hold 1.5s, then fade out
    const t3 = setTimeout(() => { setPhase('gone'); onComplete?.() }, 2900)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [onComplete])

  if (phase === 'gone') return null

  const isOut = phase === 'out'

  return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 200, pointerEvents: isOut ? 'none' : 'all' }}>

      {/* Background — matches splash logo bg */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, #0d1f3c 0%, #04080f 75%)',
        opacity: isOut ? 0 : 1,
        transition: isOut ? 'opacity 0.8s ease' : 'opacity 0.5s ease',
      }} />

      {/* Logo */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        opacity: phase === 'in' ? 0 : isOut ? 0 : 1,
        transform: phase === 'in' ? 'scale(0.88)' : 'scale(1)',
        transition: phase === 'in'
          ? 'opacity 0.55s ease, transform 0.55s cubic-bezier(0.34,1.56,0.64,1)'
          : isOut
          ? 'opacity 0.75s ease'
          : undefined,
      }}>
        <img
          src="/logo-splash.png"
          alt="iWonde Tag"
          style={{ height: '220px', width: 'auto', display: 'block' }}
        />

        <p className="text-center text-xs font-bold tracking-[0.2em] uppercase mt-5 select-none"
          style={{ color: '#f59e0b', letterSpacing: '0.22em' }}>
          Spot&nbsp;·&nbsp;Decode It&nbsp;·&nbsp;Collect All 51 States
        </p>
      </div>
    </div>
  )
}
