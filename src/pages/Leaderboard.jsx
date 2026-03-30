import { useState, useEffect } from 'react'
import api from '../lib/api'

const TABS = [
  { key: 'all',    label: 'All Time' },
  { key: 'weekly', label: 'Weekly'   },
  { key: 'daily',  label: 'Daily'    },
]

const DEMO = [
  { rank: 1, name: 'PlateHunter99', points: 48200, streak: 14, states: 38 },
  { rank: 2, name: 'VanityKing',    points: 39500, streak: 7,  states: 29 },
  { rank: 3, name: 'RoadTripPro',   points: 32100, streak: 21, states: 44 },
  { rank: 4, name: 'TagMaster',     points: 28700, streak: 5,  states: 22 },
  { rank: 5, name: 'DecodeQueen',   points: 24400, streak: 9,  states: 31 },
  { rank: 6, name: 'WizardWheels',  points: 19800, streak: 3,  states: 18 },
]

const MEDALS = ['🥇', '🥈', '🥉']

function PodiumCard({ entry, pos }) {
  const heights = ['h-24', 'h-16', 'h-20']
  const colors  = [
    'bg-gradient-to-b from-yellow-500/30 to-yellow-900/20 border-yellow-600/50',
    'bg-gradient-to-b from-slate-400/20 to-slate-700/20 border-slate-500/40',
    'bg-gradient-to-b from-orange-600/20 to-orange-900/20 border-orange-700/40',
  ]
  return (
    <div className={`flex flex-col items-center gap-2 flex-1 ${pos === 0 ? 'mt-0' : 'mt-4'}`}>
      <div className="text-3xl">{MEDALS[pos]}</div>
      <div className="text-center">
        <div className="font-bold text-white text-sm">{entry.name}</div>
        <div className="text-brand-yellow text-xs font-bold">{entry.points.toLocaleString()} pts</div>
      </div>
      <div className={`w-full rounded-t-xl border ${colors[pos]} ${heights[pos]}`} />
    </div>
  )
}

export default function Leaderboard() {
  const [entries, setEntries] = useState([])
  const [tab, setTab]         = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/leaderboard?period=${tab}`)
      .then(({ data }) => setEntries(data))
      .catch(() => setEntries(DEMO))
      .finally(() => setLoading(false))
  }, [tab])

  const top3 = entries.slice(0, 3)
  const rest  = entries.slice(3)

  return (
    <div className="pb-nav px-4 pt-3 space-y-5 max-w-lg mx-auto">

      {/* Header */}
      <div className="pt-4">
        <h1 className="text-2xl font-black text-white">Leaderboard</h1>
        <p className="text-slate-500 text-sm">Top decoders worldwide</p>
      </div>

      {/* Tab switcher */}
      <div className="flex glass-card rounded-xl p-1 gap-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-brand-blue text-white shadow-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="shimmer rounded-2xl h-16" />
          ))}
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length === 3 && (
            <div className="glass-card rounded-2xl p-4 pt-2">
              <div className="flex items-end gap-2">
                <PodiumCard entry={top3[1]} pos={1} />
                <PodiumCard entry={top3[0]} pos={0} />
                <PodiumCard entry={top3[2]} pos={2} />
              </div>
            </div>
          )}

          {/* Rest of list */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map((e, i) => (
                <div
                  key={e.rank || i + 4}
                  className="glass-card rounded-xl px-4 py-3 flex items-center gap-4"
                >
                  <span className="text-slate-500 font-bold w-6 text-sm text-center">
                    #{e.rank || i + 4}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-white">{e.name}</div>
                    <div className="text-xs text-slate-500">
                      🔥 {e.streak}d streak · 🗺️ {e.states || '?'} states
                    </div>
                  </div>
                  <div className="text-brand-yellow font-bold text-sm">
                    {e.points?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {entries.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <div className="text-4xl mb-3">🏆</div>
              <div className="font-semibold">No entries yet</div>
              <div className="text-sm mt-1">Be the first to submit a plate!</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
