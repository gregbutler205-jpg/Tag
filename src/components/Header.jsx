import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Header({ logoVisible = true }) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <header
      className="sticky top-0 z-40 flex items-center w-full px-4"
      style={{
        background: 'linear-gradient(135deg, #0c1628 0%, #122040 50%, #0c1628 100%)',
        borderBottom: '2px solid #f59e0b',
        minHeight: '152px',
        boxShadow: '0 2px 20px rgba(245,158,11,0.15)',
      }}
    >
      <Link to="/" className="flex items-center">
        {!imgFailed ? (
          <img
            src="/logo-dark-navy.png"
            alt="iWonde Tag"
            data-splash-target
            style={{
              height: '132px',
              width: 'auto',
              maxWidth: '420px',
              display: 'block',
              opacity: logoVisible ? 1 : 0,
              transition: logoVisible ? 'opacity 0.4s ease' : 'none',
            }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex items-baseline gap-1 select-none"
            style={{ opacity: logoVisible ? 1 : 0, transition: logoVisible ? 'opacity 0.4s ease' : 'none' }}>
            <span className="text-white font-extrabold text-3xl tracking-tight">iWonde</span>
            <span className="font-black text-4xl tracking-widest"
              style={{ color: '#f59e0b', textShadow: '0 0 16px rgba(245,158,11,0.6)' }}>
              TAG
            </span>
          </div>
        )}
      </Link>
    </header>
  )
}
