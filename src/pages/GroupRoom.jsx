import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PlateCard from '../components/PlateCard'
import { STATES } from '../lib/rarityConfig'
import api from '../lib/api'

export default function GroupRoom() {
  const { id }  = useParams()
  const [group, setGroup]         = useState(null)
  const [challenges, setChallenges] = useState([])
  const [active, setActive]       = useState(null)
  const [guess, setGuess]         = useState('')
  const [plateText, setPlateText] = useState('')
  const [state, setState]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [view, setView]           = useState('challenges') // 'challenges' | 'submit'

  useEffect(() => {
    api.get(`/groups/${id}`).then(({ data }) => {
      setGroup(data.group)
      setChallenges(data.challenges || [])
    }).catch(() => {
      setGroup({ name: 'My Group', code: 'GRP123' })
      setChallenges([])
    })
  }, [id])

  const submitPlate = async () => {
    if (!plateText.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/groups/${id}/plates`, { text: plateText.toUpperCase(), state })
      setChallenges(c => [data, ...c])
      setPlateText(''); setState(''); setView('challenges')
    } finally { setSubmitting(false) }
  }

  const submitGuess = async (challengeId) => {
    if (!guess.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/groups/${id}/challenges/${challengeId}/guess`, { guess: guess.trim() })
      setGuess(''); setActive(null)
      const { data } = await api.get(`/groups/${id}`)
      setChallenges(data.challenges || [])
    } finally { setSubmitting(false) }
  }

  return (
    <div className="pb-nav px-4 space-y-4 max-w-lg mx-auto">

      {/* Header */}
      <div className="pt-6 flex items-center gap-3">
        <Link to="/groups" className="text-slate-500 hover:text-white transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white truncate">{group?.name || 'Group'}</h1>
          {group && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Code:</span>
              <span className="text-xs font-mono font-bold text-brand-yellow">{group.code}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('challenges')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${view === 'challenges' ? 'bg-brand-blue text-white' : 'glass-card text-slate-400'}`}
          >
            Challenges
          </button>
          <button
            onClick={() => setView('submit')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${view === 'submit' ? 'bg-brand-blue text-white' : 'glass-card text-slate-400'}`}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Submit plate form */}
      {view === 'submit' && (
        <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
          <div className="text-sm font-bold text-white">Submit a Plate to the Group</div>
          <input
            value={plateText}
            onChange={e => setPlateText(e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, ''))}
            placeholder="GR8FUL"
            maxLength={8}
            className="plate w-full px-6 py-4 text-center text-3xl tracking-[0.3em] focus:outline-none focus:ring-4 focus:ring-brand-blue/40 placeholder:text-slate-400"
            style={{ background: 'linear-gradient(145deg, #fef9e7 0%, #fef3c7 50%, #fde68a 100%)' }}
          />
          <select value={state} onChange={e => setState(e.target.value)}
            className="w-full glass-card border-navy-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue appearance-none">
            <option value="">State (optional)</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={submitPlate} disabled={!plateText.trim() || submitting}
            className="w-full bg-brand-blue hover:bg-brand-blue-light disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all shadow-glow">
            {submitting ? 'Posting...' : '📤 Post to Group'}
          </button>
        </div>
      )}

      {/* Challenges list */}
      {view === 'challenges' && (
        <div className="space-y-3">
          {challenges.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-5xl">🏷️</div>
              <div className="text-white font-bold">No plates yet</div>
              <div className="text-slate-500 text-sm">Be the first to post a plate!</div>
              <button onClick={() => setView('submit')}
                className="bg-brand-blue text-white font-bold px-6 py-2.5 rounded-xl shadow-glow transition-all">
                Submit a Plate
              </button>
            </div>
          ) : (
            challenges.map(c => (
              <div key={c.id} className="glass-card rounded-2xl p-4 space-y-3">
                <PlateCard plate={c.plateText} state={c.state} result={c.revealed ? c.aiResult : null} />

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>by <span className="text-slate-300">{c.submittedBy}</span></span>
                  <span className={c.timeLeft === 'Closed' ? 'text-red-400' : 'text-brand-yellow'}>
                    {c.guessCount || 0} guesses · {c.timeLeft || 'Open'}
                  </span>
                </div>

                {!c.hasGuessed && !c.isOwn && !c.revealed && (
                  active === c.id ? (
                    <div className="space-y-2 animate-fade-up">
                      <input
                        value={guess}
                        onChange={e => setGuess(e.target.value)}
                        placeholder="Your interpretation..."
                        className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        onKeyDown={e => e.key === 'Enter' && submitGuess(c.id)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setActive(null)}
                          className="flex-1 glass-card py-2 rounded-xl text-slate-400 text-sm">Cancel</button>
                        <button onClick={() => submitGuess(c.id)} disabled={!guess.trim() || submitting}
                          className="flex-1 bg-brand-blue disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm">
                          {submitting ? 'Submitting...' : 'Submit'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setActive(c.id)}
                      className="w-full glass-card hover:border-brand-blue/50 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-all">
                      Submit your interpretation →
                    </button>
                  )
                )}

                {c.hasGuessed && !c.revealed && (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500">
                    <span className="animate-pulse">⏳</span>
                    Waiting for blind window to close...
                  </div>
                )}

                {c.isOwn && !c.revealed && (
                  <div className="text-xs text-slate-600 text-center">You submitted this plate</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
