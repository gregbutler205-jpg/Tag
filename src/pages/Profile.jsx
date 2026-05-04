import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import { RARITY } from '../lib/rarityConfig'
import BackButton from '../components/BackButton'
import api from '../lib/api'

function compressToBase64(file, size = 160) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      // Center-crop to square
      const min = Math.min(img.width, img.height)
      const sx = (img.width  - min) / 2
      const sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.src = url
  })
}

const RANK_TIERS = [
  { min: 0,      label: 'Rookie',      color: 'text-slate-400',  icon: '🔰' },
  { min: 500,    label: 'Spotter',     color: 'text-green-400',  icon: '👁️' },
  { min: 2000,   label: 'Decoder',     color: 'text-blue-400',   icon: '🔍' },
  { min: 5000,   label: 'Hunter',      color: 'text-purple-400', icon: '🎯' },
  { min: 10000,  label: 'Tag Master',  color: 'text-yellow-400', icon: '🏆' },
  { min: 25000,  label: 'Wizard',      color: 'text-brand-yellow', icon: '🧙' },
]

function getRank(pts) {
  return [...RANK_TIERS].reverse().find(r => pts >= r.min) || RANK_TIERS[0]
}

const RARITY_COLORS = {
  common: 'bg-slate-700',
  uncommon: 'bg-emerald-800',
  rare: 'bg-blue-800',
  epic: 'bg-purple-800',
  legendary: 'bg-yellow-800',
}

export default function Profile() {
  const { user, points, streak, statesCollected, logout, avatarBase64, setAvatar, setUser } = useStore()
  const rank = getRank(points)
  const initials = user?.name?.slice(0, 2).toUpperCase() || '??'
  const fileRef = useRef(null)

  // Username edit state
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameError, setNameError] = useState(null)
  const [nameSuccess, setNameSuccess] = useState(false)

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await compressToBase64(file)
    setAvatar(b64)
  }

  function startEditName() {
    setNewName(user?.name || '')
    setNameError(null)
    setNameSuccess(false)
    setEditingName(true)
  }

  async function saveName() {
    const trimmed = newName.trim()
    if (!trimmed || trimmed.length < 2) {
      setNameError('Name must be at least 2 characters')
      return
    }
    if (trimmed === user?.name) { setEditingName(false); return }
    setNameLoading(true)
    setNameError(null)
    try {
      const { data } = await api.put('/auth/profile', { displayName: trimmed })
      // Save new token + update store
      localStorage.setItem('token', data.token)
      setUser(data.user)
      setNameSuccess(true)
      setEditingName(false)
      setTimeout(() => setNameSuccess(false), 3000)
    } catch (err) {
      setNameError(err.response?.data?.error || 'Failed to update name')
    } finally {
      setNameLoading(false)
    }
  }

  return (
    <div className="pb-nav px-4 pt-3 space-y-4 max-w-lg mx-auto">

      <div className="pt-2"><BackButton to="/" /></div>
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-black text-white">Profile</h1>
      </div>

      {/* Avatar card */}
      <div className="glass-card rounded-2xl p-6 text-center space-y-3">
        <div className="relative inline-block">
          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          {/* Avatar circle — tap to change */}
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full mx-auto block overflow-hidden shadow-glow focus:outline-none group"
            title="Tap to change photo"
          >
            {avatarBase64 ? (
              <img src={avatarBase64} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-blue to-brand-blue-dark flex items-center justify-center text-3xl font-black text-white">
                {initials}
              </div>
            )}
            {/* Camera overlay on hover/tap */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z"/>
                <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zM12 10.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd"/>
              </svg>
            </div>
          </button>
          <span className="absolute -bottom-1 -right-1 text-xl">{rank.icon}</span>
          {/* Edit badge */}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -top-1 -right-1 w-6 h-6 bg-brand-yellow rounded-full flex items-center justify-center shadow-md"
            title="Change photo"
          >
            <svg viewBox="0 0 20 20" fill="#0c1628" className="w-3.5 h-3.5">
              <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z"/>
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z"/>
            </svg>
          </button>
        </div>
        <div className="space-y-1">
          {/* Display name + edit */}
          {editingName && user ? (
            <div className="flex items-center gap-2 justify-center">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                maxLength={30}
                autoFocus
                className="bg-navy-800 border border-brand-blue rounded-xl px-3 py-1.5 text-white text-sm font-bold text-center focus:outline-none w-44"
              />
              <button
                onClick={saveName}
                disabled={nameLoading}
                className="bg-brand-blue text-white text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-50"
              >
                {nameLoading ? '...' : 'Save'}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="text-slate-500 text-xs font-bold px-2 py-1.5 rounded-xl hover:text-slate-300"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 justify-center">
              <div className="text-xl font-bold text-white">{user?.name || 'Guest Player'}</div>
              {user && (
                <button
                  onClick={startEditName}
                  className="text-slate-500 hover:text-brand-yellow transition-colors"
                  title="Edit username"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z"/>
                  </svg>
                </button>
              )}
            </div>
          )}
          {nameError && <p className="text-red-400 text-xs">{nameError}</p>}
          {nameSuccess && <p className="text-emerald-400 text-xs">Username updated!</p>}
          <div className={`text-sm font-semibold ${rank.color}`}>{rank.label}</div>
          <div className="text-slate-500 text-xs mt-0.5">{user?.email || 'Not signed in'}</div>
        </div>
        {avatarBase64 && (
          <button onClick={() => setAvatar(null)}
            className="text-slate-600 hover:text-slate-400 text-xs font-semibold transition-colors -mt-1">
            Remove photo
          </button>
        )}
        {!user ? (
          <Link to="/signin"
            className="inline-block bg-brand-blue hover:bg-brand-blue-light text-white font-bold px-8 py-2.5 rounded-xl transition-all shadow-glow">
            Sign In / Create Account
          </Link>
        ) : (
          <button onClick={logout}
            className="text-slate-500 hover:text-red-400 text-sm font-semibold transition-colors mt-1">
            Sign Out
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Points',    value: points.toLocaleString(), icon: '⭐', color: 'text-yellow-400' },
          { label: 'Current Streak',  value: streak > 0 ? `${streak} days` : '—', icon: '🔥', color: 'text-orange-400' },
          { label: 'States Collected',value: `${statesCollected.length} / 51`, icon: '🗺️', color: 'text-blue-400' },
          { label: 'Rank',            value: rank.label,              icon: rank.icon, color: rank.color },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="glass-card rounded-2xl p-4">
            <div className="text-2xl mb-2">{icon}</div>
            <div className={`text-xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Rank progression */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="text-sm font-bold text-slate-300">Rank Progression</div>
        <div className="space-y-2">
          {RANK_TIERS.map((r, i) => {
            const nextMin = RANK_TIERS[i + 1]?.min ?? Infinity
            const active  = points >= r.min && points < nextMin
            const done    = points >= nextMin
            return (
              <div key={r.label} className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${active ? 'bg-navy-700 border border-navy-500' : ''}`}>
                <span className="text-lg w-7">{r.icon}</span>
                <span className={`text-sm font-semibold flex-1 ${done ? 'text-slate-500 line-through' : active ? 'text-white' : 'text-slate-500'}`}>
                  {r.label}
                </span>
                <span className="text-xs text-slate-600">{r.min.toLocaleString()} pts</span>
                {done && <span className="text-emerald-500 text-xs">✓</span>}
                {active && <span className="text-brand-yellow text-xs font-bold">← You</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Rarity guide */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="text-sm font-bold text-slate-300">Rarity Tiers</div>
        <div className="space-y-2">
          {Object.entries(RARITY).map(([key, r]) => (
            <div key={key} className="flex items-center gap-3">
              <div className={`w-2 h-6 rounded-full ${RARITY_COLORS[key]}`} />
              <span className={`text-sm font-bold w-24 ${r.color}`}>{r.label}</span>
              <span className="text-slate-500 text-xs flex-1">{r.multiplier}× multiplier</span>
              <span className="text-slate-400 text-xs font-semibold">{r.points} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer links */}
      <div className="flex justify-center gap-6 pb-2 flex-wrap">
        <Link to="/privacy"  className="text-slate-600 text-xs hover:text-slate-400 transition-colors">Privacy Policy</Link>
        <Link to="/help"     className="text-slate-600 text-xs hover:text-slate-400 transition-colors">How to Play</Link>
        <Link to="/feedback" className="text-slate-600 text-xs hover:text-slate-400 transition-colors">Send Feedback</Link>
      </div>

    </div>
  )
}
