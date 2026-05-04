import { useState } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'

export default function Header({ logoVisible = true }) {
  const [imgFailed, setImgFailed] = useState(false)
  const { user, avatarBase64 } = useStore()

  return (
    <header
      className="sticky top-0 z-40 w-full px-4"
      style={{
        background: 'linear-gradient(135deg, #0c1628 0%, #122040 50%, #0c1628 100%)',
        borderBottom: '2px solid #f59e0b',
        boxShadow: '0 2px 20px rgba(245,158,11,0.15)',
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between" style={{ minHeight: '152px' }}>

        {/* Left — Help button */}
        <Link to="/help"
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-brand-yellow transition-colors w-12 shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.384 0 4.709-.574.501-1.284.752-1.917.752v.75a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75c.573 0 1.141-.208 1.565-.58.697-.609.697-1.52 0-2.129zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd"/>
          </svg>
          <span className="text-[9px] font-semibold uppercase tracking-wide">Help</span>
        </Link>

        {/* Center — Logo */}
        <Link to="/" className="flex items-center justify-center flex-1">
          {!imgFailed ? (
            <img
              src="/logo.png"
              alt="Tag Wizard"
              data-splash-target
              style={{
                height: '132px',
                width: 'auto',
                maxWidth: '280px',
                display: 'block',
                opacity: logoVisible ? 1 : 0,
                transition: logoVisible ? 'opacity 0.4s ease' : 'none',
              }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex items-baseline gap-1 select-none"
              style={{ opacity: logoVisible ? 1 : 0, transition: logoVisible ? 'opacity 0.4s ease' : 'none' }}>
              <span className="text-white font-extrabold text-3xl tracking-tight">Tag</span>
              <span className="font-black text-4xl tracking-widest"
                style={{ color: '#f59e0b', textShadow: '0 0 16px rgba(245,158,11,0.6)' }}>
                WIZARD
              </span>
            </div>
          )}
        </Link>

        {/* Right — Sign In / Profile */}
        <Link to={user ? '/profile' : '/signin'}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-brand-yellow transition-colors w-12 shrink-0">
          {avatarBase64 ? (
            <img
              src={avatarBase64}
              alt="avatar"
              className="w-7 h-7 rounded-full object-cover border-2 border-brand-yellow/60"
            />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd"/>
            </svg>
          )}
          <span className="text-[9px] font-semibold uppercase tracking-wide">
            {user ? 'Profile' : 'Sign In'}
          </span>
        </Link>

      </div>
    </header>
  )
}
