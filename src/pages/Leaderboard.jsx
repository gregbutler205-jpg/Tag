import { useState, useEffect } from 'react'
import api from '../lib/api'

export default function Leaderboard() {
  const [entries, setEntries] = useState([])
  const [tab, setTab] = useState('all')

  useEffect(() => {
    api.get(`/leaderboard?period=${tab}`).then(({ data }) => setEntries(data)).catch(() => {
      setEntries([
        { rank: 1, name: 'PlateHunter99', points: 4820, streak: 14 },
        { rank: 2, name: 'VanityKing', points: 3950, streak: 7 },
        { rank: 3, name: 'RoadTripPro', points: 3200, streak: 21 },
      ])
    })
  }, [tab])

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-4">
        <h1 className="text-2xl font-black">Leaderboard</h1>
      </div>

      <div className="flex rounded-xl bg-slate-800 p-1 gap-1">
        {['all','daily','weekly'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
            {t === 'all' ? 'All Time' : t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={e.rank || i} className={`flex items-center gap-4 rounded-2xl p-4 border ${i === 0 ? 'bg-yellow-900/30 border-yellow-700/50' : i === 1 ? 'bg-slate-700/30 border-slate-600/50' : i === 2 ? 'bg-orange-900/20 border-orange-700/30' : 'bg-slate-800 border-slate-700'}`}>
            <div className="text-2xl font-black w-8 text-center">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${e.rank || i + 1}`}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{e.name}</div>
              <div className="text-xs text-slate-400">🔥 {e.streak}-day streak</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-yellow-400">{e.points?.toLocaleString()}</div>
              <div className="text-xs text-slate-400">pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
