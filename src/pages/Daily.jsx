import { useState, useEffect } from 'react'
import PlateCard from '../components/PlateCard'
import useStore from '../store/useStore'
import api from '../lib/api'
import BackButton from '../components/BackButton'
import SafetyBanner from '../components/SafetyBanner'

export default function Daily() {
  const [daily, setDaily]         = useState(null)
  const [guess, setGuess]         = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { addPoints, markDailyDone, streak, lastDailyDate } = useStore()

  const todayStr   = new Date().toDateString()
  const alreadyDone = lastDailyDate === todayStr

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  useEffect(() => {
    api.get('/daily')
      .then(({ data }) => {
        setDaily(data)
        if (alreadyDone && data.result) { setResult(data.result); setSubmitted(true) }
      })
      .catch(() => setDaily({ plate: 'GR8FUL', id: 'demo' }))
      .finally(() => setLoading(false))
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
      setResult({ primary: guess, points: 50, rarity: 'common', feedback: 'Answer recorded offline!' })
      setSubmitted(true)
      addPoints(50)
      markDailyDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pb-nav max-w-lg mx-auto">
      <SafetyBanner />

      <div className="px-4 pt-3 space-y-4">
      {/* Header */}
      <div className="pt-2"><BackButton to="/" /></div>
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Tag of the Day</h1>
          <p className="text-slate-500 text-sm">{dateLabel}</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-900/40 border border-orange-700/50 rounded-xl px-3 py-2">
            <span className="text-lg">🔥</span>
            <span className="text-orange-300 font-bold text-sm">{streak}d</span>
          </div>
        )}
      </div>

      {/* Already done banner */}
      {alreadyDone && !loading && (
        <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/40 rounded-xl px-4 py-3">
          <span className="text-emerald-400 text-lg">✓</span>
          <span className="text-emerald-300 text-sm font-semibold">You completed today's challenge!</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="shimmer rounded-xl h-20 w-full" />
          <div className="shimmer rounded-lg h-4 w-3/4" />
          <div className="shimmer rounded-lg h-4 w-1/2" />
        </div>
      ) : (
        <PlateCard
          plate={daily?.plate}
          state={daily?.state}
          result={submitted ? result : null}
          animate={!loading}
        >
          {!submitted && (
            <div className="space-y-3 pt-1">
              <input
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="What does this plate mean?"
                className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={!guess.trim() || submitting}
                className="w-full bg-brand-blue hover:bg-brand-blue-light disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-glow"
              >
                {submitting
                  ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⟳</span> Decoding...</span>
                  : '✨ Submit Guess'}
              </button>
            </div>
          )}

          {submitted && result && (
            <div className="pt-1 border-t border-navy-600 space-y-1">
              {result.feedback && (
                <p className="text-slate-400 text-sm">{result.feedback}</p>
              )}
            </div>
          )}
        </PlateCard>
      )}

      {/* Tomorrow teaser */}
      {submitted && (
        <div className="glass-card rounded-2xl p-4 text-center space-y-1 animate-fade-up">
          <div className="text-2xl">🌟</div>
          <div className="text-white font-semibold">Streak saved!</div>
          <div className="text-slate-500 text-sm">A new plate unlocks tomorrow</div>
        </div>
      )}

      {/* How scoring works */}
      {!submitted && !loading && (
        <div className="glass-card rounded-xl p-4 space-y-2">
          <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">How scoring works</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div>⚡ Speed bonus — answer fast</div>
            <div>🎯 Creativity — unique reads</div>
            <div>🔥 Streak — daily bonus</div>
            <div>⭐ Rarity — harder plates</div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
