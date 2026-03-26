import { useState, useEffect } from 'react'
import PlateCard from '../components/PlateCard'
import useStore from '../store/useStore'
import api from '../lib/api'

export default function Daily() {
  const [daily, setDaily] = useState(null)
  const [guess, setGuess] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { addPoints, markDailyDone, streak, lastDailyDate } = useStore()

  const todayStr = new Date().toDateString()
  const alreadyDone = lastDailyDate === todayStr

  useEffect(() => {
    api.get('/daily').then(({ data }) => {
      setDaily(data)
      if (alreadyDone && data.result) {
        setResult(data.result)
        setSubmitted(true)
      }
    }).catch(() => {
      // Fallback demo plate
      setDaily({ plate: 'GR8FUL', id: 'demo' })
    }).finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    if (!guess.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/daily/${daily.id}/submit`, { guess: guess.trim() })
      setResult(data)
      setSubmitted(true)
      addPoints(data.points || 100)
      markDailyDone()
    } catch {
      // Submit offline with local scoring
      setResult({ primary: guess, points: 50, rarity: 'common', feedback: 'Answer recorded!' })
      setSubmitted(true)
      addPoints(50)
      markDailyDone()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 animate-pulse">Loading today's plate...</div>
    </div>
  )

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-4">
        <h1 className="text-2xl font-black">Tag of the Day</h1>
        <p className="text-slate-400 text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-2 bg-orange-900/30 border border-orange-700/50 rounded-xl px-4 py-2">
        <span className="text-xl">🔥</span>
        <span className="text-orange-300 font-semibold">{streak}-day streak</span>
      </div>

      <PlateCard plate={daily?.plate} result={submitted ? result : null}>
        {!submitted && (
          <div className="space-y-3 pt-2">
            <input
              value={guess}
              onChange={e => setGuess(e.target.value)}
              placeholder="What does this plate mean?"
              className="w-full bg-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button
              onClick={handleSubmit}
              disabled={!guess.trim() || submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-bold py-3 rounded-xl transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Guess'}
            </button>
          </div>
        )}
        {submitted && result && (
          <div className="pt-2 space-y-2">
            <div className="text-green-400 font-bold">+{result.points} pts</div>
            {result.feedback && <p className="text-slate-400 text-sm">{result.feedback}</p>}
          </div>
        )}
      </PlateCard>

      {submitted && (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-center">
          <div className="text-slate-400 text-sm">Come back tomorrow for a new plate!</div>
        </div>
      )}
    </div>
  )
}
