import useStore from '../store/useStore'
import { RARITY } from '../lib/rarityConfig'

export default function Profile() {
  const { user, points, streak, statesCollected } = useStore()

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-4">
        <h1 className="text-2xl font-black">Profile</h1>
      </div>

      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-black mx-auto">
          {user?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="text-xl font-bold">{user?.name || 'Guest Player'}</div>
          <div className="text-slate-400 text-sm">{user?.email || 'Sign in to save progress'}</div>
        </div>
        {!user && (
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-xl transition-colors">
            Sign In / Create Account
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Points', value: points.toLocaleString(), icon: '⭐' },
          { label: 'Current Streak', value: `${streak} days`, icon: '🔥' },
          { label: 'States Collected', value: `${statesCollected.length} / 51`, icon: '🗺️' },
          { label: 'Rank', value: 'Rookie', icon: '🏅' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-2">
        <h2 className="font-semibold">Rarity Tiers</h2>
        {Object.entries(RARITY).map(([key, r]) => (
          <div key={key} className="flex items-center gap-3">
            <span className={`w-24 text-xs font-bold ${r.color}`}>{r.label}</span>
            <span className="text-slate-400 text-xs">{r.multiplier}x multiplier</span>
            <span className="ml-auto text-slate-400 text-xs">{r.points} base pts</span>
          </div>
        ))}
      </div>
    </div>
  )
}
