import { useState, useEffect, useRef } from 'react'
import PlateCard from '../components/PlateCard'
import useStore from '../store/useStore'
import api from '../lib/api'
import BackButton from '../components/BackButton'
import SafetyBanner from '../components/SafetyBanner'
import { track } from '../lib/analytics'

const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Daily() {
  const [daily, setDaily]           = useState(null)
  const [guess, setGuess]           = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [revealed, setRevealed]     = useState(false)
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [elapsed, setElapsed]       = useState(0)
  const startRef                    = useRef(null)

  const { addPoints, markDailyDone, streak, lastDailyDate } = useStore()

  const todayStr   = new Date().toDateString()
  const alreadyDone = lastDailyDate === todayStr

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  useEffect(() => {
    // Record start time before loading daily data
    const todayKey = `iwt_daily_start_${new Date().toDateString()}`
    if (!sessionStorage.getItem(todayKey)) {
      sessionStorage.setItem(todayKey, Date.now().toString())
    }
    startRef.current = parseInt(sessionStorage.getItem(todayKey))

    api.get('/daily')
      .then(({ data }) => {
        setDaily(data)
        if (alreadyDone) setSubmitted(true)
      })
      .catch(() => setDaily({ plate: 'GR8FUL', id: 'demo' }))
      .finally(() => setLoading(false))
  }, [])

  // Timer interval — only runs when challenge is active
  useEffect(() => {
    if (submitted || alreadyDone) return
    const iv = setInterval(() => {
      if (startRef.current) setElapsed(Math.round((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(iv)
  }, [submitted, alreadyDone])

  const handleSubmit = async () => {
    if (!guess.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/daily/${daily.id}/submit`, { guess: guess.trim() })
      setResult(data)
      setSubmitted(true)
      addPoints(data.points || 100)
      markDailyDone()
      track('daily_completed', {
        plate:           daily?.plate,
        points:          data.points || 100,
        elapsed_seconds: startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : 0,
        streak,
      })

      // Sync to daily groups (fire and forget)
      const elapsedNow = startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : 0
      api.post('/groups/daily-sync', {
        score: data?.points || 50,
        timeSeconds: elapsedNow,
        date: new Date().toDateString(),
        guess: guess.trim(),
      }).catch(() => {})
    } catch (err) {
      // Server rejected as duplicate — don't award points again
      if (err.response?.status === 409) {
        markDailyDone()
        setSubmitted(true)
        setResult({ primary: guess, points: 0, feedback: err.response.data?.error || "You've already submitted today — come back tomorrow!" })
        return
      }
      // Offline / network error — award offline credit
      setResult({ primary: guess, points: 50, rarity: 'common', feedback: 'Answer recorded offline!' })
      setSubmitted(true)
      addPoints(50)
      markDailyDone()

      // Sync to daily groups (fire and forget)
      const elapsedNow = startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : 0
      api.post('/groups/daily-sync', {
        score: 50,
        timeSeconds: elapsedNow,
        date: new Date().toDateString(),
        guess: guess.trim(),
      }).catch(() => {})
    } finally {
      setSubmitting(false)
    }
  }

  const handleReveal = () => {
    setRevealed(true)
    setSubmitted(true)
    markDailyDone()
    track('daily_revealed', { plate: daily?.plate, elapsed_seconds: startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : 0 })
    // Sync to groups with 0 score (fire and forget)
    api.post('/groups/daily-sync', {
      score: 0,
      timeSeconds: startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : 0,
      date: new Date().toDateString(),
      guess: '(skipped)',
    }).catch(() => {})
  }

  return (
    <div className="pb-nav max-w-lg mx-auto">
      <SafetyBanner />

      <div className="px-4 pt-3 space-y-4">
      {/* Header */}
      <div className="pt-2"><BackButton to="/" /></div>
      <div className="pt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Tag of the Day</h1>
          <p className="text-slate-500 text-sm">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-900/40 border border-orange-700/50 rounded-xl px-3 py-2">
              <span className="text-lg">🔥</span>
              <span className="text-orange-300 font-bold text-sm">{streak}d</span>
            </div>
          )}
          {!submitted && !alreadyDone && (
            <div className="flex items-center gap-1.5 bg-navy-800 border border-navy-600 rounded-xl px-3 py-2">
              <span className="text-xs text-slate-500">⏱</span>
              <span className="text-white font-mono font-bold text-sm">{fmtTime(elapsed)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Congratulations card (shown first after submitting) ── */}
      {submitted && (
        <div className="glass-card rounded-2xl p-5 text-center space-y-2 animate-fade-up border border-emerald-700/40">
          <div className="text-4xl">{revealed ? '📖' : '🌟'}</div>
          <div className="text-white font-black" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>
            {revealed ? 'Now You Know!' : 'Streak Saved!'}
          </div>
          <div className="text-slate-400 text-sm">A new plate unlocks tomorrow</div>
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

              {/* I Don't Know button */}
              <button
                onClick={handleReveal}
                className="w-full text-slate-500 hover:text-slate-300 text-sm font-semibold py-2 transition-colors"
              >
                🤷 I Don't Know. Show Me.
              </button>
            </div>
          )}

          {submitted && revealed && daily?.meaning && (
            <div className="pt-2 border-t border-navy-600 space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">The Answer</p>
              <p className="text-white font-semibold text-base leading-snug">{daily.meaning}</p>
              <p className="text-slate-500 text-xs">No points this time — come back tomorrow! 🌟</p>
            </div>
          )}
          {submitted && result && !revealed && (
            <div className="pt-1 border-t border-navy-600 space-y-1">
              {result.feedback && (
                <p className="text-slate-400 text-sm">{result.feedback}</p>
              )}
            </div>
          )}
        </PlateCard>
      )}

      {/* Already done badge (shown below plate after submitting) */}
      {(alreadyDone || submitted) && !loading && (
        <div className="flex items-center justify-center gap-2 bg-emerald-900/30 border border-emerald-700/40 rounded-xl px-4 py-2.5">
          <span className="text-emerald-400">✓</span>
          <span className="text-emerald-300 text-sm font-semibold">You completed today's challenge!</span>
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
