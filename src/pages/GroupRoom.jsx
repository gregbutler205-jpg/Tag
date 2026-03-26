import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import PlateCard from '../components/PlateCard'
import { STATES } from '../lib/rarityConfig'
import api from '../lib/api'

export default function GroupRoom() {
  const { id } = useParams()
  const [group, setGroup] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [active, setActive] = useState(null)
  const [guess, setGuess] = useState('')
  const [plateText, setPlateText] = useState('')
  const [state, setState] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState('challenges') // 'challenges' | 'submit'

  useEffect(() => {
    api.get(`/groups/${id}`).then(({ data }) => {
      setGroup(data.group)
      setChallenges(data.challenges || [])
    }).catch(() => {})
  }, [id])

  const submitPlate = async () => {
    if (!plateText.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/groups/${id}/plates`, { text: plateText.toUpperCase(), state })
      setChallenges(c => [data, ...c])
      setPlateText('')
      setState('')
      setView('challenges')
    } finally {
      setSubmitting(false)
    }
  }

  const submitGuess = async (challengeId) => {
    if (!guess.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/groups/${id}/challenges/${challengeId}/guess`, { guess: guess.trim() })
      setGuess('')
      setActive(null)
      // Refresh
      const { data } = await api.get(`/groups/${id}`)
      setChallenges(data.challenges || [])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">{group?.name || 'Group'}</h1>
          {group && <p className="text-slate-400 text-xs">Code: {group.code}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('challenges')} className={`text-sm px-3 py-1.5 rounded-lg ${view === 'challenges' ? 'bg-blue-600' : 'bg-slate-700'}`}>Challenges</button>
          <button onClick={() => setView('submit')} className={`text-sm px-3 py-1.5 rounded-lg ${view === 'submit' ? 'bg-blue-600' : 'bg-slate-700'}`}>+ Add</button>
        </div>
      </div>

      {view === 'submit' && (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
          <h2 className="font-bold">Submit a Plate to the Group</h2>
          <input
            value={plateText}
            onChange={e => setPlateText(e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, ''))}
            placeholder="Plate text"
            maxLength={8}
            className="w-full bg-yellow-100 text-slate-900 rounded-xl px-4 py-3 text-center font-black text-2xl tracking-widest font-mono uppercase placeholder:text-slate-400 focus:outline-none"
          />
          <select value={state} onChange={e => setState(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none">
            <option value="">State (optional)</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={submitPlate} disabled={!plateText.trim() || submitting} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-bold py-3 rounded-xl transition-colors">
            {submitting ? 'Posting...' : 'Post to Group'}
          </button>
        </div>
      )}

      {view === 'challenges' && (
        <div className="space-y-3">
          {challenges.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">🏷️</div>
              <p>No plates yet. Be the first to submit one!</p>
            </div>
          )}
          {challenges.map(c => (
            <div key={c.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
              <PlateCard plate={c.plateText} result={c.revealed ? c.aiResult : null} />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>by {c.submittedBy}</span>
                <span>{c.guessCount || 0} guesses · {c.timeLeft || 'Closed'}</span>
              </div>
              {!c.hasGuessed && !c.isOwn && !c.revealed && (
                active === c.id ? (
                  <div className="space-y-2">
                    <input value={guess} onChange={e => setGuess(e.target.value)} placeholder="Your interpretation..." className="w-full bg-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-2">
                      <button onClick={() => setActive(null)} className="flex-1 bg-slate-700 py-2 rounded-xl text-sm">Cancel</button>
                      <button onClick={() => submitGuess(c.id)} disabled={!guess.trim() || submitting} className="flex-1 bg-blue-600 py-2 rounded-xl text-sm font-bold disabled:opacity-40">Submit</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setActive(c.id)} className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-xl text-sm transition-colors">
                    Submit your guess →
                  </button>
                )
              )}
              {c.hasGuessed && !c.revealed && (
                <div className="text-xs text-slate-400 text-center">Waiting for window to close...</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
