import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import BackButton from '../components/BackButton'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]
const RARE_STATES = new Set(['AK', 'HI', 'ND', 'SD', 'VT'])

// ── Countdown timer component ─────────────────────────────────────────────────
function Countdown({ startedAt, timerSeconds }) {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
      setRemaining(Math.max(0, timerSeconds - elapsed))
    }
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [startedAt, timerSeconds])

  if (remaining === null) return null
  const secs  = Math.ceil(remaining)
  const pct   = remaining / timerSeconds
  const urgent = secs <= 10

  return (
    <div className={`text-center ${urgent ? 'animate-pulse' : ''}`}>
      <div className={`text-7xl font-black tabular-nums leading-none ${urgent ? 'text-red-400' : 'text-white'}`}>
        {secs}
      </div>
      <div className="text-slate-500 text-xs mt-1 mb-3">seconds left</div>
      <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${urgent ? 'bg-red-500' : 'bg-brand-blue'}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}

// ── Plate submission form ─────────────────────────────────────────────────────
function PlateForm({ onSubmit, onCancel, showCancel, busy }) {
  const [plateText, setPlateText]   = useState('')
  const [plateState, setPlateState] = useState('')

  const handleSubmit = () => {
    if (!plateText.trim() || busy) return
    onSubmit(plateText.trim(), plateState || undefined)
  }

  return (
    <div className="space-y-3">
      <input
        value={plateText}
        onChange={e => setPlateText(e.target.value.toUpperCase())}
        placeholder="PLATE TEXT"
        maxLength={10}
        className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-4 text-white placeholder:text-slate-600 text-center tracking-widest font-black text-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue"
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        autoFocus
      />
      <select
        value={plateState}
        onChange={e => setPlateState(e.target.value)}
        className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
      >
        <option value="">State (optional)</option>
        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <div className="flex gap-2">
        {showCancel && (
          <button
            onClick={onCancel}
            className="flex-1 glass-card py-3 rounded-xl text-slate-400 text-sm"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!plateText.trim() || busy}
          className="flex-1 bg-brand-blue disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all shadow-glow"
        >
          {busy ? 'Starting…' : '🚀 Start Round'}
        </button>
      </div>
    </div>
  )
}

// ── State Hunt widget ─────────────────────────────────────────────────────────
function StateHuntWidget({ sessionId, onSpot }) {
  const [huntState, setHuntState] = useState('')
  const [busy, setBusy]           = useState(false)
  const [result, setResult]       = useState(null) // { alreadySpotted, points }

  const logState = async () => {
    if (!huntState || busy) return
    setBusy(true)
    try {
      const { data } = await api.post(`/road-trip/${sessionId}/state`, { state: huntState })
      setResult(data)
      setHuntState('')
      if (onSpot) onSpot(data)
    } catch (err) {
      alert(err.response?.data?.error || 'Could not log state')
    } finally { setBusy(false) }
  }

  return (
    <div className="glass-card rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-white">🗺️ Spot a State</div>
        {result && (
          <div className={`text-sm font-bold transition-opacity ${result.alreadySpotted ? 'text-slate-400' : 'text-brand-yellow'}`}>
            {result.alreadySpotted ? 'Already spotted' : `+${result.points} pts!`}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <select
          value={huntState}
          onChange={e => setHuntState(e.target.value)}
          className="flex-1 bg-navy-800 border border-navy-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
        >
          <option value="">Pick a state…</option>
          {US_STATES.map(s => (
            <option key={s} value={s}>{s}{RARE_STATES.has(s) ? ' ⭐' : ''}</option>
          ))}
        </select>
        <button
          onClick={logState}
          disabled={!huntState || busy}
          className="bg-brand-blue disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm"
        >
          {busy ? '…' : 'Log!'}
        </button>
      </div>
      <div className="text-xs text-slate-500">⭐ Rare (AK/HI/ND/SD/VT) · First to spot = 2× bonus</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RoadTripRoom() {
  const { id }     = useParams()
  const navigate   = useNavigate()

  const [gameState, setGameState]     = useState(null)
  const [fetchErr, setFetchErr]       = useState(null)
  const [guess, setGuess]             = useState('')
  const [guessBusy, setGuessBusy]     = useState(false)
  const [guessErr, setGuessErr]       = useState(null)
  const [plateBusy, setPlateBusy]     = useState(false)
  const [showPlateForm, setShowPlateForm] = useState(false)

  const prevRoundId = useRef(null)
  const pollTimer   = useRef(null)

  const poll = useCallback(async () => {
    try {
      const { data } = await api.get(`/road-trip/${id}`)
      setGameState(data)
      setFetchErr(null)
      // Reset per-round state when the active round changes
      if (data.currentRound?.id !== prevRoundId.current) {
        prevRoundId.current = data.currentRound?.id ?? null
        setGuess('')
        setGuessErr(null)
        setShowPlateForm(false)
      }
    } catch (err) {
      setFetchErr(err.response?.data?.error || 'Connection lost — retrying…')
    }
  }, [id])

  useEffect(() => {
    poll()
    pollTimer.current = setInterval(poll, 3000)
    return () => clearInterval(pollTimer.current)
  }, [poll])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const submitGuess = async () => {
    if (!guess.trim() || guessBusy) return
    setGuessBusy(true)
    setGuessErr(null)
    try {
      await api.post(`/road-trip/${id}/round/${gameState.currentRound.id}/guess`, {
        guess: guess.trim(),
      })
      await poll()
    } catch (err) {
      setGuessErr(err.response?.data?.error || 'Could not submit guess')
    } finally { setGuessBusy(false) }
  }

  const submitPlate = async (plateText, plateState) => {
    setPlateBusy(true)
    try {
      await api.post(`/road-trip/${id}/round`, { plateText, state: plateState })
      await poll()
      // Phase changes to 'active' after poll, form disappears naturally
    } catch (err) {
      alert(err.response?.data?.error || 'Could not start round')
    } finally {
      setPlateBusy(false)
    }
  }

  const endTrip = async () => {
    if (!window.confirm('End the road trip for everyone?')) return
    try {
      await api.post(`/road-trip/${id}/end`)
      await poll()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not end trip')
    }
  }

  const deleteTrip = async () => {
    if (!window.confirm('Delete this road trip? All rounds, guesses, and scores will be permanently removed.')) return
    try {
      await api.delete(`/road-trip/${id}`)
      navigate('/groups')
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete trip')
    }
  }

  // ── Loading / error screens ──────────────────────────────────────────────────

  if (fetchErr && !gameState) {
    return (
      <div className="pb-nav px-4 pt-3 max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="text-6xl">🚗</div>
        <div className="text-white font-bold">{fetchErr}</div>
        <Link to="/groups" className="inline-block mt-4 bg-brand-blue text-white font-bold px-6 py-3 rounded-xl">
          Back to Groups
        </Link>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="pb-nav px-4 pt-3 max-w-lg mx-auto space-y-3 mt-8">
        {[1,2,3].map(i => <div key={i} className="shimmer rounded-2xl h-20" />)}
      </div>
    )
  }

  // ── Derived state ─────────────────────────────────────────────────────────────

  const { session, players, currentRound } = gameState
  const isHost     = players.find(p => p.isYou)?.isHost ?? false
  const hasDecode  = session.gameMode === 'decode'    || session.gameMode === 'combo'
  const hasStates  = session.gameMode === 'statehunt' || session.gameMode === 'combo'

  const phase =
    session.status === 'ended'               ? 'ended'   :
    !currentRound || session.status === 'waiting' ? 'lobby'   :
    currentRound.status === 'active'         ? 'active'  :
    currentRound.status === 'judging'        ? 'judging' :
                                               'judged'

  const gameModeLabel =
    session.gameMode === 'combo'     ? 'Combo'       :
    session.gameMode === 'statehunt' ? 'State Hunt'  :
                                       'Decode Only'

  // ── Rarity badge ──────────────────────────────────────────────────────────────
  const rarityClass = r =>
    r === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
    r === 'epic'      ? 'bg-purple-500/20 text-purple-400' :
    r === 'rare'      ? 'bg-blue-500/20   text-blue-400'   :
    r === 'uncommon'  ? 'bg-green-500/20  text-green-400'  :
                        'bg-slate-700     text-slate-400'

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="pb-nav px-4 pt-3 space-y-4 max-w-lg mx-auto">

      {/* Back + header */}
      <div className="pt-2"><BackButton to="/groups" /></div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black text-white flex items-center gap-2 flex-wrap">
            🚗 {session.name}
          </h1>
          <p className="text-slate-500 text-xs">{gameModeLabel} · {session.timerSeconds}s rounds</p>
        </div>
        {/* Room code — shown until session ends */}
        {session.status !== 'ended' && (
          <div className="text-right shrink-0">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Code</div>
            <div className="text-3xl font-black text-brand-yellow tracking-widest leading-tight">
              {session.code}
            </div>
          </div>
        )}
      </div>

      {/* Live scoreboard */}
      <div className="glass-card rounded-2xl p-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Scoreboard</div>
        <div className="space-y-1">
          {players.map((p, i) => (
            <div
              key={p.userId}
              className={`flex items-center gap-2 py-1 px-2 rounded-lg ${p.isYou ? 'bg-brand-blue/10 border border-brand-blue/20' : ''}`}
            >
              <div className="text-slate-500 text-xs w-4 text-center tabular-nums">{i + 1}</div>
              <div className="flex-1 text-sm font-medium text-white truncate">
                {p.displayName}
                {p.isHost && <span className="ml-1 text-slate-500 text-xs">👑</span>}
                {p.isYou  && <span className="ml-1 text-brand-blue text-xs">(you)</span>}
              </div>
              <div className="font-bold text-brand-yellow text-sm tabular-nums">
                {p.score.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════ LOBBY ══════════════════ */}
      {phase === 'lobby' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6 text-center space-y-3">
            <div className="text-5xl">🚗</div>
            <div className="text-white font-bold text-lg">Waiting to start</div>
            <div className="text-slate-400 text-sm">
              Share code{' '}
              <span className="text-brand-yellow font-black tracking-widest">{session.code}</span>
              {' '}so everyone can join, then spot a plate to kick things off!
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="text-sm font-bold text-white">Submit First Plate</div>
            <PlateForm
              onSubmit={submitPlate}
              onCancel={null}
              showCancel={false}
              busy={plateBusy}
            />
          </div>
        </div>
      )}

      {/* ══════════════════ ACTIVE ROUND ══════════════════ */}
      {phase === 'active' && currentRound && (
        <div className="space-y-3">
          {/* Round label */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wide text-slate-400">Round {currentRound.roundNumber}</span>
            <span>submitted by {currentRound.submittedBy}</span>
          </div>

          {/* Plate display */}
          <div className="glass-card rounded-2xl p-6 text-center space-y-2">
            <div className="text-4xl font-black text-white tracking-widest">
              {currentRound.plateText}
            </div>
            {currentRound.state && (
              <span className="inline-block px-3 py-1 rounded-lg bg-brand-blue/20 text-brand-blue text-sm font-bold">
                {currentRound.state}
              </span>
            )}
          </div>

          {/* Countdown */}
          <div className="glass-card rounded-2xl p-5">
            <Countdown
              startedAt={currentRound.startedAt}
              timerSeconds={currentRound.timerSeconds}
            />
          </div>

          {/* Guess input */}
          {hasDecode && (
            currentRound.hasSubmitted ? (
              <div className="glass-card rounded-2xl p-4 text-center space-y-1">
                <div className="text-brand-blue text-lg font-bold">✓ Guess submitted!</div>
                <div className="text-slate-300 text-sm italic">"{currentRound.myGuess}"</div>
                <div className="text-slate-500 text-xs mt-1">Waiting for others…</div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="text-sm font-bold text-white">Your interpretation</div>
                <input
                  value={guess}
                  onChange={e => setGuess(e.target.value)}
                  placeholder="What does this plate mean?"
                  className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  onKeyDown={e => e.key === 'Enter' && submitGuess()}
                  autoFocus
                />
                {guessErr && <div className="text-red-400 text-sm">{guessErr}</div>}
                <button
                  onClick={submitGuess}
                  disabled={!guess.trim() || guessBusy}
                  className="w-full bg-brand-blue disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all shadow-glow"
                >
                  {guessBusy ? 'Submitting…' : '⚡ Submit Guess'}
                </button>
              </div>
            )
          )}

          {/* State Hunt */}
          {hasStates && (
            <StateHuntWidget sessionId={id} onSpot={() => poll()} />
          )}
        </div>
      )}

      {/* ══════════════════ JUDGING ══════════════════ */}
      {phase === 'judging' && currentRound && (
        <div className="space-y-3">
          <div className="glass-card rounded-2xl p-8 text-center space-y-5">
            <div className="text-4xl font-black text-white tracking-widest">{currentRound.plateText}</div>
            {currentRound.state && (
              <span className="inline-block px-3 py-1 rounded-lg bg-brand-blue/20 text-brand-blue text-sm font-bold">
                {currentRound.state}
              </span>
            )}
            <div className="flex flex-col items-center gap-3">
              <div className="w-9 h-9 border-[3px] border-brand-blue border-t-transparent rounded-full animate-spin" />
              <div className="text-white font-bold text-lg">AI is judging answers…</div>
              <div className="text-slate-500 text-sm">Hold tight!</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ JUDGED — ROUND RESULTS ══════════════════ */}
      {phase === 'judged' && currentRound && (
        <div className="space-y-3">
          {/* AI verdict card */}
          {currentRound.aiResult && (
            <div className="glass-card rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide flex-1">
                  Round {currentRound.roundNumber} · AI Answer
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rarityClass(currentRound.aiResult.rarity)}`}>
                  {currentRound.aiResult.rarity}
                </span>
              </div>
              <div className="text-3xl font-black text-white tracking-widest">{currentRound.plateText}</div>
              {currentRound.state && (
                <span className="inline-block px-2 py-0.5 rounded bg-brand-blue/20 text-brand-blue text-xs font-bold">
                  {currentRound.state}
                </span>
              )}
              <div className="text-brand-yellow font-bold text-xl">{currentRound.aiResult.primary}</div>
              {currentRound.aiResult.explanation && (
                <div className="text-slate-400 text-sm leading-relaxed">{currentRound.aiResult.explanation}</div>
              )}
            </div>
          )}

          {/* Per-player guesses */}
          {currentRound.guesses?.length > 0 && (
            <div className="glass-card rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Round Results</div>
              <div className="space-y-2">
                {currentRound.guesses.map((g, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-2.5 rounded-xl ${g.isYou ? 'bg-brand-blue/10 border border-brand-blue/20' : ''}`}
                  >
                    <div className="text-xl leading-none">
                      {g.verdict === 'agree' ? '✅' : g.verdict === 'partial' ? '🟡' : '❌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {g.playerName}
                        {g.isYou && <span className="text-brand-blue text-xs ml-1">(you)</span>}
                      </div>
                      <div className="text-xs text-slate-400 truncate italic">"{g.guess}"</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-brand-yellow text-sm">+{g.score}</div>
                      <div className="text-xs text-slate-500">{g.elapsed}s</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next plate */}
          {showPlateForm ? (
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <div className="text-sm font-bold text-white">Next Plate</div>
              <PlateForm
                onSubmit={submitPlate}
                onCancel={() => setShowPlateForm(false)}
                showCancel
                busy={plateBusy}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowPlateForm(true)}
              className="w-full bg-brand-blue hover:bg-brand-blue-light text-white font-bold py-4 rounded-2xl transition-all shadow-glow text-lg"
            >
              🚀 Submit Next Plate
            </button>
          )}

          {/* State Hunt between rounds */}
          {hasStates && (
            <StateHuntWidget sessionId={id} onSpot={() => poll()} />
          )}
        </div>
      )}

      {/* ══════════════════ ENDED ══════════════════ */}
      {phase === 'ended' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6 text-center space-y-3">
            <div className="text-6xl">🏆</div>
            <div className="text-white font-black text-2xl">Trip Complete!</div>
            {players[0] && (
              <div className="text-brand-yellow font-bold text-lg">
                🥇 {players[0].displayName} wins with {players[0].score.toLocaleString()} pts!
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-4 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Final Standings</div>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div
                  key={p.userId}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-xl ${p.isYou ? 'bg-brand-blue/10 border border-brand-blue/20' : ''}`}
                >
                  <div className="text-xl w-8 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-slate-500 text-sm">{i + 1}.</span>}
                  </div>
                  <div className="flex-1 font-medium text-white">
                    {p.displayName}
                    {p.isYou && <span className="text-brand-blue text-xs ml-1">(you)</span>}
                  </div>
                  <div className="font-black text-brand-yellow text-lg tabular-nums">
                    {p.score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/groups"
            className="block w-full text-center bg-brand-blue hover:bg-brand-blue-light text-white font-bold py-4 rounded-2xl transition-all shadow-glow"
          >
            Back to Groups
          </Link>
        </div>
      )}

      {/* ── Host controls ────────────────────────────────────────────────────── */}
      {isHost && (
        <div className="border-t border-navy-700 pt-4 space-y-2">
          {session.status !== 'ended' && (
            <button
              onClick={endTrip}
              className="w-full glass-card text-red-400 border border-red-500/20 hover:border-red-500/50 py-3 rounded-xl text-sm font-bold transition-all"
            >
              🛑 End Trip
            </button>
          )}
          <button
            onClick={deleteTrip}
            className="w-full glass-card text-red-400 border border-red-500/20 hover:border-red-500/50 py-3 rounded-xl text-sm font-bold transition-all"
          >
            🗑 Delete Trip
          </button>
        </div>
      )}

      {/* Connection error banner (non-fatal) */}
      {fetchErr && gameState && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-red-500/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
            ⚠️ {fetchErr}
          </div>
        </div>
      )}
    </div>
  )
}
