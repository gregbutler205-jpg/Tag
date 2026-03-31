import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PlateCard from '../components/PlateCard'
import { STATES, STATE_NAMES } from '../lib/rarityConfig'
import api from '../lib/api'
import useStore from '../store/useStore'

// ── State chip picker (same pattern as Submit.jsx) ────────────────────────────
function StateChipPicker({ value, onChange }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? STATES.filter(s =>
        s.toLowerCase().includes(search.toLowerCase()) ||
        STATE_NAMES[s].toLowerCase().includes(search.toLowerCase()))
    : STATES

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full glass-card border-navy-600 rounded-xl px-4 py-3 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-brand-blue">
        <span className={value ? 'text-white font-semibold text-sm' : 'text-slate-500 text-sm'}>
          {value ? `${value} — ${STATE_NAMES[value]}` : 'State (optional)'}
        </span>
        <span className="flex items-center gap-2">
          {value && (
            <span onClick={e => { e.stopPropagation(); onChange('') }}
              className="text-slate-500 hover:text-red-400 text-base leading-none transition-colors" role="button">✕</span>
          )}
          <svg viewBox="0 0 20 20" fill="currentColor"
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd"/>
          </svg>
        </span>
      </button>
      {open && (
        <div className="glass-card rounded-xl p-3 space-y-2 border border-navy-500">
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search state…"
            className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {filtered.map(s => (
              <button key={s} type="button" title={STATE_NAMES[s]}
                onClick={() => { onChange(s); setOpen(false); setSearch('') }}
                className={`rounded-lg py-2 text-xs font-black tracking-wide transition-all active:scale-95 ${
                  value === s
                    ? 'bg-brand-blue text-white shadow-glow'
                    : 'bg-navy-900 text-slate-400 hover:bg-navy-700 hover:text-white border border-navy-700'
                }`}>{s}</button>
            ))}
          </div>
          <button type="button" onClick={() => { onChange(''); setOpen(false); setSearch('') }}
            className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
              !value ? 'bg-brand-blue text-white' : 'text-slate-500 hover:text-slate-300'
            }`}>Unknown / Not sure</button>
        </div>
      )}
    </div>
  )
}

// ── Verdict badge ─────────────────────────────────────────────────────────────
function VerdictBadge({ verdict, score }) {
  const map = {
    agree:    { label: `✓ Correct  +${score} pts`, cls: 'bg-emerald-900/40 border-emerald-600/50 text-emerald-300' },
    partial:  { label: `~ Partial  +${score} pts`, cls: 'bg-amber-900/40  border-amber-600/50  text-amber-300'   },
    disagree: { label: '✗ No match',                cls: 'bg-slate-800/60  border-slate-600/40  text-slate-400'   },
  }
  const m = map[verdict] || map.disagree
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${m.cls}`}>
      {m.label}
    </span>
  )
}

// ── Main GroupRoom ─────────────────────────────────────────────────────────────
export default function GroupRoom() {
  const { id }  = useParams()
  const { user, addPoints } = useStore()

  const [group, setGroup]           = useState(null)
  const [challenges, setChallenges] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [active, setActive]         = useState(null)   // challenge id with open guess box
  const [guess, setGuess]           = useState('')
  const [plateText, setPlateText]   = useState('')
  const [state, setState]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [revealing, setRevealing]   = useState(null)   // challenge id being revealed
  const [revealData, setRevealData] = useState({})     // cid → { aiResult, guesses }
  const [view, setView]             = useState('challenges') // 'challenges' | 'scores' | 'post'

  // ── Load group data ──────────────────────────────────────────────────────────
  const loadGroup = () =>
    api.get(`/groups/${id}`).then(({ data }) => {
      setGroup(data.group)
      setChallenges(data.challenges || [])
    }).catch(() => {
      setGroup({ name: 'My Group', code: 'GRP123' })
      setChallenges([])
    })

  const loadLeaderboard = () =>
    api.get(`/groups/${id}/leaderboard`).then(({ data }) => setLeaderboard(data)).catch(() => {})

  useEffect(() => { loadGroup(); loadLeaderboard() }, [id])

  // ── Submit plate to group ────────────────────────────────────────────────────
  const submitPlate = async () => {
    if (!plateText.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/groups/${id}/plates`, { text: plateText.toUpperCase(), state })
      setChallenges(c => [data, ...c])
      setPlateText(''); setState(''); setView('challenges')
    } finally { setSubmitting(false) }
  }

  // ── Submit guess ─────────────────────────────────────────────────────────────
  const submitGuess = async (challengeId) => {
    if (!guess.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/groups/${id}/challenges/${challengeId}/guess`, { guess: guess.trim() })
      setGuess(''); setActive(null)
      loadGroup()
    } finally { setSubmitting(false) }
  }

  // ── Reveal results ────────────────────────────────────────────────────────────
  const reveal = async (challengeId) => {
    setRevealing(challengeId)
    try {
      const { data } = await api.post(`/groups/${id}/challenges/${challengeId}/reveal`)
      setRevealData(prev => ({ ...prev, [challengeId]: data }))
      // Award the current user their own points locally (UI feedback)
      const mine = data.guesses?.find(g => g.userId === user?.id)
      if (mine?.score > 0) addPoints(mine.score)
      // Refresh group so challenge shows as revealed
      loadGroup()
      loadLeaderboard()
    } catch {
      // Server unreachable — still update UI
    } finally {
      setRevealing(null)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const isClosed  = c => c.timeLeft === 'Closed'
  const canReveal = c => isClosed(c) && !c.revealed

  return (
    <div className="pb-nav px-4 space-y-4 max-w-lg mx-auto">

      {/* ── Header ─────────────────────────────────────────── */}
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
              <span className="text-xs text-slate-500">Invite code:</span>
              <span className="text-xs font-mono font-bold text-brand-yellow tracking-widest">{group.code}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────── */}
      <div className="flex glass-card rounded-xl p-1 gap-1">
        {[
          { key: 'challenges', label: '🏷️ Plates' },
          { key: 'scores',     label: '📊 Scores' },
          { key: 'post',       label: '+ Post' },
        ].map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              view === t.key ? 'bg-brand-blue text-white shadow-glow' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          CHALLENGES TAB
      ══════════════════════════════════════════════════════ */}
      {view === 'challenges' && (
        <div className="space-y-4">
          {challenges.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-5xl">🏷️</div>
              <div className="text-white font-bold">No plates yet</div>
              <div className="text-slate-500 text-sm">Be the first to post a plate!</div>
              <button onClick={() => setView('post')}
                className="bg-brand-blue text-white font-bold px-6 py-2.5 rounded-xl shadow-glow">
                Post a Plate
              </button>
            </div>
          ) : (
            challenges.map(c => {
              const rd = revealData[c.id]  // locally cached reveal results
              const isRevealed = c.revealed || !!rd

              return (
                <div key={c.id} className="glass-card rounded-2xl overflow-hidden">

                  {/* Plate display */}
                  <div className="p-4 space-y-3">
                    <PlateCard
                      plate={c.plateText}
                      state={c.state}
                      result={isRevealed ? (rd?.aiResult || c.aiResult) : null}
                    />

                    {/* Meta row */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>by <span className="text-slate-300 font-semibold">{c.submittedBy}</span></span>
                      <span className={isClosed(c) ? 'text-red-400 font-semibold' : 'text-brand-yellow font-semibold'}>
                        {c.guessCount || 0} guess{c.guessCount !== 1 ? 'es' : ''} · {c.timeLeft}
                      </span>
                    </div>
                  </div>

                  {/* ── Guess input (window open, not own, not guessed) ── */}
                  {!c.hasGuessed && !c.isOwn && !isClosed(c) && !isRevealed && (
                    <div className="border-t border-navy-700 p-3">
                      {active === c.id ? (
                        <div className="space-y-2 animate-fade-up">
                          <input
                            value={guess}
                            onChange={e => setGuess(e.target.value)}
                            placeholder="Your interpretation…"
                            maxLength={80}
                            className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            onKeyDown={e => e.key === 'Enter' && submitGuess(c.id)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setActive(null)}
                              className="flex-1 glass-card py-2 rounded-xl text-slate-400 text-sm">
                              Cancel
                            </button>
                            <button onClick={() => submitGuess(c.id)} disabled={!guess.trim() || submitting}
                              className="flex-1 bg-brand-blue disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm">
                              {submitting ? 'Submitting…' : 'Submit'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setActive(c.id)}
                          className="w-full glass-card hover:border-brand-blue/50 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-all">
                          Submit your interpretation →
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Waiting for reveal ── */}
                  {(c.hasGuessed || c.isOwn) && !isRevealed && !isClosed(c) && (
                    <div className="border-t border-navy-700 px-4 py-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                      <span className="animate-pulse">⏳</span>
                      {c.isOwn ? 'Waiting for guesses…' : 'Guess submitted — waiting for window to close…'}
                    </div>
                  )}

                  {/* ── Reveal button (window closed, not yet revealed) ── */}
                  {canReveal(c) && !rd && (
                    <div className="border-t border-navy-700 p-3">
                      <button
                        onClick={() => reveal(c.id)}
                        disabled={revealing === c.id}
                        className="w-full bg-brand-yellow hover:brightness-110 disabled:opacity-50 text-navy-900 font-black py-3 rounded-xl text-sm transition-all active:scale-[0.98] shadow-glow"
                      >
                        {revealing === c.id
                          ? <span className="flex items-center justify-center gap-2">
                              <span className="animate-spin">⟳</span> Scoring guesses…
                            </span>
                          : '🏆 Reveal Results'}
                      </button>
                      {c.guessCount === 0 && (
                        <p className="text-center text-slate-600 text-xs mt-2">No guesses were submitted</p>
                      )}
                    </div>
                  )}

                  {/* ── Results (after reveal) ── */}
                  {isRevealed && (rd?.guesses?.length > 0 || c.revealed) && (
                    <div className="border-t border-navy-700 p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Results</p>

                      {/* Show cached reveal data if available */}
                      {rd?.guesses ? (
                        <div className="space-y-2">
                          {rd.guesses.map((g, rank) => (
                            <div key={g.id}
                              className={`rounded-xl px-3 py-2.5 border ${
                                g.verdict === 'agree'
                                  ? 'bg-emerald-900/20 border-emerald-700/40'
                                  : g.verdict === 'partial'
                                  ? 'bg-amber-900/20 border-amber-700/40'
                                  : 'bg-navy-900/60 border-navy-700/40'
                              }`}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  {rank === 0 && g.score > 0 && <span className="text-sm">🥇</span>}
                                  {rank === 1 && g.score > 0 && <span className="text-sm">🥈</span>}
                                  {rank === 2 && g.score > 0 && <span className="text-sm">🥉</span>}
                                  <span className="text-white text-sm font-bold">{g.username}</span>
                                </div>
                                <VerdictBadge verdict={g.verdict} score={g.score} />
                              </div>
                              <p className="text-slate-300 text-sm italic">"{g.guess}"</p>
                              {g.reasoning && (
                                <p className="text-slate-500 text-xs mt-1">{g.reasoning}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 text-xs text-center py-2">
                          Tap "Reveal Results" to see scores
                        </p>
                      )}
                    </div>
                  )}

                </div>
              )
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SCORES TAB
      ══════════════════════════════════════════════════════ */}
      {view === 'scores' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-navy-700 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Group Leaderboard</span>
              <span className="text-xs text-slate-500">{group?.name}</span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="text-4xl">📊</div>
                <div className="text-slate-500 text-sm">No scores yet — reveal some results!</div>
              </div>
            ) : (
              <div className="divide-y divide-navy-700">
                {leaderboard.map((member, i) => (
                  <div key={member.userId} className="flex items-center gap-3 px-4 py-3">
                    {/* Rank */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-400'
                      : i === 1 ? 'bg-slate-500/20 text-slate-300'
                      : i === 2 ? 'bg-orange-700/20 text-orange-400'
                      : 'bg-navy-800 text-slate-500'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>

                    {/* Name + accuracy */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate">
                        {member.username}
                        {member.userId === user?.id && (
                          <span className="ml-1.5 text-brand-yellow text-[10px] font-black">YOU</span>
                        )}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {member.correct}/{member.guesses} correct
                        {member.guesses > 0 && (
                          <span className="ml-1.5">
                            · {Math.round((member.correct / member.guesses) * 100)}% accuracy
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div className="text-brand-yellow font-black text-base">
                        {member.total.toLocaleString()}
                      </div>
                      <div className="text-slate-600 text-[10px] uppercase tracking-wide">pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl px-4 py-3">
            <p className="text-slate-500 text-xs leading-relaxed">
              <span className="text-slate-300 font-semibold">Group points count toward your global score.</span>
              {' '}Earn +75 pts for a correct guess, +35 pts for a partial match.
              Points are awarded when results are revealed.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          POST TAB
      ══════════════════════════════════════════════════════ */}
      {view === 'post' && (
        <div className="glass-card rounded-2xl p-4 space-y-4 animate-fade-up">
          <div className="text-sm font-bold text-white">Post a Plate to the Group</div>

          <input
            value={plateText}
            onChange={e => setPlateText(e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, ''))}
            placeholder="GR8FUL"
            maxLength={8}
            className="plate w-full px-6 py-4 text-center text-3xl tracking-[0.3em] focus:outline-none focus:ring-4 focus:ring-brand-blue/40 placeholder:text-slate-400"
          />

          <StateChipPicker value={state} onChange={setState} />

          <div className="bg-[#111820] border border-navy-700 rounded-xl px-4 py-3 space-y-1">
            <p className="text-slate-400 text-xs leading-relaxed">
              <span className="text-slate-300 font-semibold">How it works:</span>
              {' '}After you post, group members have <span className="text-brand-yellow font-semibold">12 hours</span> to submit their interpretation.
              Once the window closes, anyone can tap <span className="text-brand-yellow font-semibold">Reveal Results</span> to score all guesses.
            </p>
          </div>

          <button onClick={submitPlate} disabled={!plateText.trim() || submitting}
            className="w-full bg-brand-blue hover:brightness-110 disabled:opacity-40 text-white font-black py-4 rounded-2xl text-base transition-all active:scale-[0.98] shadow-glow">
            {submitting ? '📡 Posting…' : '📤 Post to Group'}
          </button>
        </div>
      )}

    </div>
  )
}
