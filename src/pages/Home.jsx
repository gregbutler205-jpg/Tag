import { Link } from 'react-router-dom'
import useStore from '../store/useStore'

export default function Home() {
  const { points, streak, statesCollected } = useStore()

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="pt-6 text-center">
        <h1 className="text-4xl font-black tracking-tight">
          <span className="text-blue-400">iWonde</span>
          <span className="text-yellow-400"> Tag</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">Decode. Compete. Collect.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Points', value: points.toLocaleString(), icon: '⭐' },
          { label: 'Streak', value: `${streak}d`, icon: '🔥' },
          { label: 'States', value: `${statesCollected.length}/51`, icon: '🗺️' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
            <div className="text-2xl">{icon}</div>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <Link to="/daily" className="flex items-center gap-4 bg-blue-600 hover:bg-blue-500 rounded-2xl p-4 transition-colors">
          <span className="text-3xl">🏷️</span>
          <div>
            <div className="font-bold">Tag of the Day</div>
            <div className="text-sm text-blue-200">Today's plate challenge</div>
          </div>
          <span className="ml-auto text-blue-200">→</span>
        </Link>

        <Link to="/submit" className="flex items-center gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl p-4 border border-slate-700 transition-colors">
          <span className="text-3xl">📸</span>
          <div>
            <div className="font-bold">Submit a Plate</div>
            <div className="text-sm text-slate-400">Camera or manual entry</div>
          </div>
          <span className="ml-auto text-slate-400">→</span>
        </Link>

        <Link to="/groups" className="flex items-center gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl p-4 border border-slate-700 transition-colors">
          <span className="text-3xl">👥</span>
          <div>
            <div className="font-bold">Group Challenges</div>
            <div className="text-sm text-slate-400">Play with friends</div>
          </div>
          <span className="ml-auto text-slate-400">→</span>
        </Link>

        <Link to="/leaderboard" className="flex items-center gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl p-4 border border-slate-700 transition-colors">
          <span className="text-3xl">🏆</span>
          <div>
            <div className="font-bold">Leaderboard</div>
            <div className="text-sm text-slate-400">Global rankings</div>
          </div>
          <span className="ml-auto text-slate-400">→</span>
        </Link>
      </div>
    </div>
  )
}
