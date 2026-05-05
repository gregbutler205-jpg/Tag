import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import PlateCard from '../components/PlateCard'
import PlateCropper from '../components/PlateCropper'
import { STATES, STATE_NAMES } from '../lib/rarityConfig'
import api from '../lib/api'
import useStore from '../store/useStore'
import { track } from '../lib/analytics'
import { getEasterEggPhrase } from '../lib/wizardPhrases'

// Compress a photo DataURL to a small JPEG thumbnail for storage
async function compressPhoto(dataUrl, maxWidth = 480) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.65))
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

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

// ── Format seconds as m:ss ────────────────────────────────────────────────────
function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── All 51 state abbreviations ────────────────────────────────────────────────
const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

// ── Tab configs per mode ──────────────────────────────────────────────────────
const MODE_TABS = {
  plates: [
    { key: 'challenges', label: '🏷️ Plates' },
    { key: 'scores',     label: '📊 Scores' },
    { key: 'members',    label: '👥 Members' },
    { key: 'post',       label: '+ Post' },
  ],
  states: [
    { key: 'states',  label: '🗺️ States' },
    { key: 'members', label: '👥 Members' },
  ],
  both: [
    { key: 'challenges', label: '🏷️ Plates' },
    { key: 'states',     label: '🗺️ States' },
    { key: 'scores',     label: '📊 Scores' },
    { key: 'members',    label: '👥 Members' },
    { key: 'post',       label: '+ Post' },
  ],
  daily: [
    { key: 'today',   label: '📅 Today' },
    { key: 'results', label: '📊 Results' },
    { key: 'members', label: '👥 Members' },
  ],
}

const MODE_DEFAULT_TAB = {
  plates: 'challenges',
  states: 'states',
  both:   'challenges',
  daily:  'today',
}

// ── Main GroupRoom ─────────────────────────────────────────────────────────────
export default function GroupRoom() {
  const { id }  = useParams()
  const navigate = useNavigate()
  const { user, addPoints } = useStore()

  const [group, setGroup]           = useState(null)
  const [challenges, setChallenges] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [active, setActive]         = useState(null)
  const [guess, setGuess]           = useState('')
  const [plateText, setPlateText]   = useState('')
  const [state, setState]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [revealing, setRevealing]   = useState(null)
  const [revealData, setRevealData] = useState({})
  const [view, setView]             = useState('challenges')

  // Photo submission state
  const fileInputRef  = useRef(null)
  const [cropSrc, setCropSrc]         = useState(null)
  const [photoData, setPhotoData]     = useState(null)
  const [ocrLoading, setOcrLoading]   = useState(false)
  const [ocrFailed, setOcrFailed]     = useState(false)
  const [postMode, setPostMode]       = useState('manual') // 'manual' | 'camera'

  // Members tab
  const [members, setMembers] = useState([])

  // States tab
  const [groupStates, setGroupStates] = useState({ myStates: [], leaderboard: [] })

  // Daily tab
  const [dailyBoard, setDailyBoard]         = useState([])
  const [victoryPhrase, setVictoryPhrase]   = useState(null)

  // ── Load group data ──────────────────────────────────────────────────────────
  const loadGroup = () =>
    api.get(`/groups/${id}`).then(({ data }) => {
      setGroup(data.group)
      setChallenges(data.challenges || [])
      // Set default tab based on mode
      const mode = data.group?.mode || 'plates'
      setView(MODE_DEFAULT_TAB[mode] || 'challenges')
    }).catch(() => {
      setGroup({ name: 'My Group', code: 'GRP123', mode: 'plates' })
      setChallenges([])
    })

  const loadLeaderboard = () =>
    api.get(`/groups/${id}/leaderboard`).then(({ data }) => setLeaderboard(data)).catch(() => {})

  const loadMembers = () =>
    api.get(`/groups/${id}/members`).then(({ data }) => setMembers(data)).catch(() => {})

  const loadGroupStates = () =>
    api.get(`/groups/${id}/states`).then(({ data }) => setGroupStates(data)).catch(() => {})

  const loadDailyBoard = () =>
    api.get(`/groups/${id}/daily-leaderboard`).then(({ data }) => {
      setDailyBoard(data)
      // Victory Easter egg — fires when the current user is #1 on the daily board
      if (data?.length >= 2 && data[0]?.isYou) {
        const phrase = getEasterEggPhrase('victory')
        setVictoryPhrase(phrase)
        track('wizard_easter_egg_shown', { trigger_type: 'victory', phrase_category: 'victory' })
      }
    }).catch(() => {})

  useEffect(() => {
    loadGroup()
    loadLeaderboard()
    loadMembers()
    loadGroupStates()
    loadDailyBoard()
  }, [id])

  // ── Share / invite ───────────────────────────────────────────────────────────
  const handleShare = async () => {
    const subject = `Join my group "${group.name}" on Tag Wizard!`
    const body = [
      `Join my group "${group.name}" on Tag Wizard! 🏷️`,
      ``,
      `Tag Wizard is a free game where you spot vanity license plates, decode their hidden meanings, collect all 50 states, and compete with friends!`,
      ``,
      `To install the free app on your phone:`,
      `• iPhone: open tag.iwonde.com in Safari → tap the Share icon (box with arrow) → "Add to Home Screen"`,
      `• Android: open tag.iwonde.com in Chrome → tap the menu (three dots) → "Add to Home Screen"`,
      ``,
      `Once you're in, join my group using invite code: ${group.code}`,
      ``,
      `Play here: https://tag.iwonde.com`,
    ].join('\n')

    try {
      if (navigator.share) {
        // Mobile: use native share sheet
        await navigator.share({ title: subject, text: body, url: 'https://tag.iwonde.com' })
      } else {
        // Desktop: open email client with subject + full message pre-filled and editable
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      }
    } catch {
      // User cancelled or share unavailable — silently fail
    }
  }

  // ── Photo OCR flow ───────────────────────────────────────────────────────────
  const handleFilePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setCropSrc(ev.target.result); setPhotoData(null); setPlateText(''); setOcrFailed(false) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropConfirm = (croppedBlob) => {
    const reader = new FileReader()
    reader.onload = async ev => {
      const dataUrl = ev.target.result
      setPhotoData(dataUrl)
      setCropSrc(null)
      setOcrLoading(true)
      setOcrFailed(false)
      try {
        const form = new FormData()
        form.append('photo', croppedBlob, 'plate.jpg')
        form.append('skipCrop', 'true')
        const { data } = await api.post('/plates/ocr', form)
        if (data.text) setPlateText(data.text.toUpperCase())
        else setOcrFailed(true)
        if (data.detectedState && !state) setState(data.detectedState)
      } catch { setOcrFailed(true) }
      finally { setOcrLoading(false) }
    }
    reader.readAsDataURL(croppedBlob)
  }

  const handleCropCancel = () => { setCropSrc(null); setPhotoData(null); setPlateText('') }

  // ── Submit plate to group ────────────────────────────────────────────────────
  const submitPlate = async () => {
    if (!plateText.trim()) return
    setSubmitting(true)
    try {
      let compressed = null
      if (photoData) compressed = await compressPhoto(photoData)
      const { data } = await api.post(`/groups/${id}/plates`, {
        text: plateText.toUpperCase(),
        state,
        photoData: compressed || undefined,
      })
      setChallenges(c => [data, ...c])
      setPlateText(''); setState(''); setPhotoData(null); setCropSrc(null)
      setOcrFailed(false); setPostMode('manual')
      setView('challenges')
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
      const mine = data.guesses?.find(g => g.userId === user?.id)
      if (mine?.score > 0) addPoints(mine.score)
      loadGroup()
      loadLeaderboard()
    } catch {
      // Server unreachable — still update UI
    } finally {
      setRevealing(null)
    }
  }

  // ── Log a state ───────────────────────────────────────────────────────────────
  const logState = async (abbr) => {
    if (groupStates.myStates.includes(abbr)) return
    try {
      await api.post(`/groups/${id}/states`, { state: abbr })
      loadGroupStates()
      track('group_state_logged', { state: abbr, group_mode: group?.mode })
    } catch {
      // silently fail
    }
  }

  // ── Reset group states ────────────────────────────────────────────────────────
  const resetGroupStates = async () => {
    if (!window.confirm('Reset all states for this group? This only affects this group.')) return
    try {
      await api.delete(`/groups/${id}/states/reset`)
      loadGroupStates()
    } catch {
      // silently fail
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const isClosed  = c => c.timeLeft === 'Closed'
  const canReveal = c => isClosed(c) && !c.revealed

  const groupMode = group?.mode || 'plates'
  const tabs = MODE_TABS[groupMode] || MODE_TABS.plates

  // Ensure current view is valid for the current mode
  const validViews = tabs.map(t => t.key)
  const currentView = validViews.includes(view) ? view : validViews[0]

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const myDailyEntry = dailyBoard.find(r => r.isYou)

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
              <span className="text-xs text-slate-500">Code:</span>
              <span className="text-sm font-mono font-bold text-brand-yellow tracking-widest">{group.code}</span>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 bg-brand-blue hover:brightness-110 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-glow"
                title="Share invite"
              >
                📤 <span>Invite</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────── */}
      <div className="flex glass-card rounded-xl p-1 gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`flex-1 min-w-0 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap px-1 ${
              currentView === t.key ? 'bg-brand-blue text-white shadow-glow' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          CHALLENGES TAB
      ══════════════════════════════════════════════════════ */}
      {currentView === 'challenges' && (
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
              const rd = revealData[c.id]
              const isRevealed = c.revealed || !!rd

              return (
                <div key={c.id} className="glass-card rounded-2xl overflow-hidden">

                  {/* Plate photo (if submitted from camera) */}
                  {c.photoData && (
                    <img src={c.photoData} alt="Submitted plate" className="w-full rounded-t-2xl object-cover max-h-48" />
                  )}

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
      {currentView === 'scores' && (
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
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-400'
                      : i === 1 ? 'bg-slate-500/20 text-slate-300'
                      : i === 2 ? 'bg-orange-700/20 text-orange-400'
                      : 'bg-navy-800 text-slate-500'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>

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
          MEMBERS TAB
      ══════════════════════════════════════════════════════ */}
      {currentView === 'members' && (
        <div className="space-y-3">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-navy-700">
              <span className="text-sm font-bold text-white">Members</span>
            </div>
            {members.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">Loading members...</div>
            ) : (
              <div className="divide-y divide-navy-700">
                {members.map(m => (
                  <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center text-sm font-black text-brand-blue shrink-0">
                      {(m.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-sm truncate">{m.username}</span>
                        {m.isCreator && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30">
                            👑 Creator
                          </span>
                        )}
                        {m.userId === user?.id && (
                          <span className="text-[10px] font-black text-brand-yellow">YOU</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        Joined {new Date(m.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STATES TAB
      ══════════════════════════════════════════════════════ */}
      {currentView === 'states' && (
        <div className="space-y-4">
          {/* Log a State */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="text-sm font-bold text-white">Log a State</div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
              {ALL_STATES.map(abbr => {
                const collected = groupStates.myStates.includes(abbr)
                return (
                  <button
                    key={abbr}
                    type="button"
                    title={STATE_NAMES[abbr] || abbr}
                    onClick={() => logState(abbr)}
                    disabled={collected}
                    className={`rounded-lg py-2 text-xs font-black tracking-wide transition-all active:scale-95 ${
                      collected
                        ? 'bg-brand-blue text-white shadow-glow'
                        : 'bg-navy-900 text-slate-400 hover:bg-navy-700 hover:text-white border border-navy-700'
                    }`}
                  >
                    {collected ? `✓` : abbr}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-slate-500">
              {groupStates.myStates.length} / {ALL_STATES.length} states collected
            </p>
          </div>

          {/* State Leaderboard */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-navy-700">
              <span className="text-sm font-bold text-white">State Leaderboard</span>
            </div>
            {groupStates.leaderboard.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No states logged yet — be the first!</div>
            ) : (
              <div className="divide-y divide-navy-700">
                {groupStates.leaderboard.map((entry, i) => (
                  <div key={entry.userId} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-400'
                      : i === 1 ? 'bg-slate-500/20 text-slate-300'
                      : i === 2 ? 'bg-orange-700/20 text-orange-400'
                      : 'bg-navy-800 text-slate-500'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate flex items-center gap-2">
                        {entry.username}
                        {entry.isYou && (
                          <span className="text-brand-yellow text-[10px] font-black">YOU</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-brand-yellow font-black text-base">{entry.count}</div>
                      <div className="text-slate-600 text-[10px] uppercase tracking-wide">states</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How States Works */}
          <div className="glass-card rounded-xl px-4 py-3 space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">How States Works</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each member logs the states they spot. Whoever collects the most states wins! In Both mode, each new state also earns +50 bonus points toward the group score.
            </p>
          </div>

          {/* Reset (owner only) */}
          {user?.id === group?.owner_id && (
            <button
              onClick={resetGroupStates}
              className="w-full py-3 rounded-xl bg-red-900/30 border border-red-700/40 text-red-400 text-sm font-bold hover:bg-red-900/50 transition-all"
            >
              🗑 Reset Group States
            </button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TODAY / DAILY TAB
      ══════════════════════════════════════════════════════ */}
      {currentView === 'today' && (
        <div className="space-y-4">
          {/* Date header */}
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-400">{todayStr}</div>
          </div>

          {/* Info card */}
          <div className="glass-card rounded-xl px-4 py-3 space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">How Daily Scoring Works</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The timer starts the moment you open the Daily page. Submit fast for a speed bonus! Formula: base points + up to 100 speed bonus (max at 0s, 0 after 5 min).
            </p>
          </div>

          {/* CTA if user hasn't submitted */}
          {!myDailyEntry && (
            <button
              onClick={() => navigate('/daily')}
              className="w-full bg-brand-blue text-white font-bold py-3 rounded-xl shadow-glow transition-all active:scale-[0.98]"
            >
              Go to Daily Challenge →
            </button>
          )}

          {/* Victory Easter Egg banner */}
          {victoryPhrase && (
            <div className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-600/40 rounded-2xl px-4 py-3">
              <span className="text-2xl">🧙</span>
              <p className="text-yellow-300 text-sm font-semibold italic">{victoryPhrase}</p>
            </div>
          )}

          {/* Leaderboard */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-navy-700">
              <span className="text-sm font-bold text-white">Today's Results</span>
            </div>
            {dailyBoard.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No results yet today</div>
            ) : (
              <div className="divide-y divide-navy-700">
                {dailyBoard.map((r, i) => (
                  <div key={r.userId} className={`flex items-center gap-3 px-4 py-3 ${r.isYou ? 'bg-brand-blue/5' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-400'
                      : i === 1 ? 'bg-slate-500/20 text-slate-300'
                      : i === 2 ? 'bg-orange-700/20 text-orange-400'
                      : 'bg-navy-800 text-slate-500'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate flex items-center gap-2">
                        {r.username}
                        {r.isYou && (
                          <span className="text-brand-yellow text-[10px] font-black">YOU</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        ⏱ {fmtTime(r.timeSeconds)}
                        {r.speedBonus > 0 && (
                          <span className="ml-2 text-emerald-400">+{r.speedBonus} speed</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-brand-yellow font-black text-base">{r.totalScore}</div>
                      <div className="text-slate-600 text-[10px] uppercase tracking-wide">pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          RESULTS TAB (daily mode, past results / scores)
      ══════════════════════════════════════════════════════ */}
      {currentView === 'results' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-navy-700">
              <span className="text-sm font-bold text-white">Daily Leaderboard</span>
            </div>
            {dailyBoard.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="text-4xl">📊</div>
                <div className="text-slate-500 text-sm">No results yet today</div>
              </div>
            ) : (
              <div className="divide-y divide-navy-700">
                {dailyBoard.map((r, i) => (
                  <div key={r.userId} className={`flex items-center gap-3 px-4 py-3 ${r.isYou ? 'bg-brand-blue/5' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-400'
                      : i === 1 ? 'bg-slate-500/20 text-slate-300'
                      : i === 2 ? 'bg-orange-700/20 text-orange-400'
                      : 'bg-navy-800 text-slate-500'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate flex items-center gap-2">
                        {r.username}
                        {r.isYou && (
                          <span className="text-brand-yellow text-[10px] font-black">YOU</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        ⏱ {fmtTime(r.timeSeconds)}
                        {r.speedBonus > 0 && (
                          <span className="ml-2 text-emerald-400">+{r.speedBonus} speed</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-brand-yellow font-black text-base">{r.totalScore}</div>
                      <div className="text-slate-600 text-[10px] uppercase tracking-wide">pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          POST TAB
      ══════════════════════════════════════════════════════ */}
      {currentView === 'post' && (
        <div className="space-y-4 animate-fade-up">

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />

          {/* Crop UI */}
          {cropSrc && (
            <PlateCropper imageSrc={cropSrc} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
          )}

          {!cropSrc && (
            <div className="glass-card rounded-2xl p-4 space-y-4">
              <div className="text-sm font-bold text-white">Post a Plate to the Group</div>

              {/* Mode toggle */}
              <div className="flex glass-card rounded-xl p-1 gap-1">
                {[{ key: 'camera', label: '📸 Camera / Upload' }, { key: 'manual', label: '⌨️ Manual' }].map(m => (
                  <button key={m.key} onClick={() => { setPostMode(m.key); setPhotoData(null); setPlateText(''); setOcrFailed(false) }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      postMode === m.key ? 'bg-brand-blue text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}>{m.label}</button>
                ))}
              </div>

              {/* Camera flow */}
              {postMode === 'camera' && !photoData && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-navy-900 rounded-2xl border-2 border-dashed border-navy-600 hover:border-brand-blue transition-colors aspect-video flex flex-col items-center justify-center gap-3">
                  <span className="text-4xl">📸</span>
                  <div className="text-center">
                    <p className="text-white font-bold">Take a Photo</p>
                    <p className="text-slate-500 text-xs">Camera · Library · Files</p>
                  </div>
                </button>
              )}

              {/* Photo preview after OCR */}
              {postMode === 'camera' && photoData && (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border border-navy-600">
                    <img src={photoData} alt="Plate" className="w-full rounded-2xl" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()}
                        className="bg-navy-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-brand-blue transition-colors">New Photo</button>
                      <button onClick={() => { setPhotoData(null); setPlateText('') }}
                        className="bg-navy-900/90 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-900 transition-colors">✕</button>
                    </div>
                    {ocrLoading && (
                      <div className="absolute inset-0 bg-navy-900/70 flex flex-col items-center justify-center gap-2 rounded-2xl">
                        <div className="text-brand-yellow animate-pulse text-sm font-bold">Reading plate...</div>
                        <div className="w-8 h-8 border-2 border-brand-yellow/30 border-t-brand-yellow rounded-full animate-spin" />
                      </div>
                    )}
                    {!ocrLoading && plateText && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-900/90 border border-emerald-600 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        ✓ Read: {plateText}
                      </div>
                    )}
                  </div>
                  {ocrFailed && (
                    <p className="text-amber-400 text-xs text-center">⚠️ Couldn't auto-read — type the plate below</p>
                  )}
                </div>
              )}

              {/* Plate text input */}
              <input
                value={plateText}
                onChange={e => setPlateText(e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, ''))}
                placeholder="GR8FUL"
                maxLength={8}
                className="plate w-full px-6 py-4 text-center text-3xl tracking-[0.3em] focus:outline-none focus:ring-4 focus:ring-brand-blue/40 placeholder:text-slate-400"
              />

              <StateChipPicker value={state} onChange={setState} />

              <div className="bg-[#111820] border border-navy-700 rounded-xl px-4 py-3">
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
      )}

    </div>
  )
}
