import useStore from '../store/useStore'
import { RARITY } from '../lib/rarityConfig'

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
  const { user, points, streak, statesCollected } = useStore()
  const rank = getRank(points)
  const initials = user?.name?.slice(0, 2).toUpperCase() || '??'

  return (
    <div className="pb-nav px-4 pt-3 space-y-4 max-w-lg mx-auto">

      {/* Header */}
      <div className="pt-4">
        <h1 className="text-2xl font-black text-white">Profile</h1>
      </div>

      {/* Avatar card */}
      <div className="glass-card rounded-2xl p-6 text-center space-y-3">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-dark flex items-center justify-center text-3xl font-black text-white mx-auto shadow-glow">
            {initials}
          </div>
          <span className="absolute -bottom-1 -right-1 text-xl">{rank.icon}</span>
        </div>
        <div>
          <div className="text-xl font-bold text-white">{user?.name || 'Guest Player'}</div>
          <div className={`text-sm font-semibold ${rank.color}`}>{rank.label}</div>
          <div className="text-slate-500 text-xs mt-0.5">{user?.email || 'Not signed in'}</div>
        </div>
        {!user && (
          <button className="bg-brand-blue hover:bg-brand-blue-light text-white font-bold px-8 py-2.5 rounded-xl transition-all shadow-glow">
            Sign In / Create Account
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Points',    value: points.toLocaleString(), icon: '⭐', color: 'text-yellow-400' },
          { label: 'Current Streak',  value: `${streak} days`,        icon: '🔥', color: 'text-orange-400' },
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

    </div>
  )
}
