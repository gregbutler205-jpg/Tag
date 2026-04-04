import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import BackButton from '../components/BackButton'

const DEMO_GROUPS = [
  { id: '1', name: 'Road Trip Squad', memberCount: 4, activeChallenges: 2, code: 'TRIP42', mode: 'plates' },
  { id: '2', name: 'Family Fun',      memberCount: 6, activeChallenges: 1, code: 'FAMLY7', mode: 'states' },
]

const MODE_OPTIONS = [
  { key: 'plates', emoji: '🏷️', label: 'Plate Decoding' },
  { key: 'states', emoji: '🗺️', label: 'States' },
  { key: 'both',   emoji: '🌟', label: 'Both' },
  { key: 'daily',  emoji: '📅', label: 'Daily Tags' },
]

const MODE_EMOJI = { plates: '🏷️', states: '🗺️', both: '🌟', daily: '📅' }

export default function Groups() {
  const [groups, setGroups]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin]     = useState(false)
  const [groupName, setGroupName]   = useState('')
  const [joinCode, setJoinCode]     = useState('')
  const [busy, setBusy]             = useState(false)
  const [mode, setMode]             = useState('plates')

  useEffect(() => {
    api.get('/groups').then(({ data }) => setGroups(data))
      .catch(() => setGroups(DEMO_GROUPS))
      .finally(() => setLoading(false))
  }, [])

  const createGroup = async () => {
    if (!groupName.trim()) return
    setBusy(true)
    try {
      const { data } = await api.post('/groups', { name: groupName.trim(), mode })
      setGroups(g => [data, ...g])
      setShowCreate(false)
      setGroupName('')
      setMode('plates')
    } catch {
      const mock = {
        id: Date.now().toString(), name: groupName.trim(), memberCount: 1,
        activeChallenges: 0, mode,
        code: 'NEW' + Math.random().toString(36).slice(2,6).toUpperCase()
      }
      setGroups(g => [mock, ...g])
      setShowCreate(false)
      setGroupName('')
      setMode('plates')
    } finally { setBusy(false) }
  }

  const joinGroup = async () => {
    if (!joinCode.trim()) return
    setBusy(true)
    try {
      const { data } = await api.post('/groups/join', { code: joinCode.trim().toUpperCase() })
      setGroups(g => [data, ...g])
      setShowJoin(false)
      setJoinCode('')
    } catch {
      setJoinCode('')
      setShowJoin(false)
    } finally { setBusy(false) }
  }

  return (
    <div className="pb-nav px-4 pt-3 space-y-4 max-w-lg mx-auto">

      {/* Header */}
      <div className="pt-2"><BackButton to="/" /></div>
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Group Challenges</h1>
          <p className="text-slate-500 text-sm">Compete blind with friends</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setShowCreate(true); setShowJoin(false) }}
          className="bg-brand-blue hover:bg-brand-blue-light text-white font-bold py-3 rounded-xl transition-all shadow-glow"
        >
          + Create Group
        </button>
        <button
          onClick={() => { setShowJoin(true); setShowCreate(false) }}
          className="glass-card hover:border-navy-500 text-white font-bold py-3 rounded-xl transition-all"
        >
          🔑 Join Group
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
          <div className="text-sm font-bold text-white">New Group</div>

          {/* Mode picker */}
          <div className="grid grid-cols-2 gap-2">
            {MODE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMode(opt.key)}
                className={`py-3 px-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  mode === opt.key
                    ? 'bg-brand-blue text-white shadow-glow'
                    : 'glass-card text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          <input
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            onKeyDown={e => e.key === 'Enter' && createGroup()}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => { setShowCreate(false); setMode('plates') }} className="flex-1 glass-card py-2 rounded-xl text-slate-400 text-sm">Cancel</button>
            <button onClick={createGroup} disabled={!groupName.trim() || busy}
              className="flex-1 bg-brand-blue disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm transition-all">
              {busy ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-up">
          <div className="text-sm font-bold text-white">Join with Code</div>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            maxLength={8}
            className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 text-center tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-brand-blue"
            onKeyDown={e => e.key === 'Enter' && joinGroup()}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setShowJoin(false)} className="flex-1 glass-card py-2 rounded-xl text-slate-400 text-sm">Cancel</button>
            <button onClick={joinGroup} disabled={!joinCode.trim() || busy}
              className="flex-1 bg-brand-blue disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm transition-all">
              {busy ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      )}

      {/* Group list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2].map(i => <div key={i} className="shimmer rounded-2xl h-20" />)}
        </div>
      ) : groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map(g => (
            <Link key={g.id} to={`/groups/${g.id}`}
              className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-navy-500 transition-all active:scale-[0.98]">
              <div className="w-11 h-11 rounded-xl bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center text-2xl shrink-0">
                👥
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white flex items-center gap-2">
                  <span>{g.name}</span>
                  <span className="text-base" title={g.mode || 'plates'}>{MODE_EMOJI[g.mode] || '🏷️'}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {g.memberCount} member{g.memberCount !== 1 ? 's' : ''}
                  {g.activeChallenges > 0 && <span className="text-brand-yellow ml-2">· {g.activeChallenges} active</span>}
                </div>
              </div>
              <div className="text-xs text-navy-500 font-mono">{g.code}</div>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-600 shrink-0">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
              </svg>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">👥</div>
          <div className="text-white font-bold">No groups yet</div>
          <div className="text-slate-500 text-sm">Create a group or join one with a code</div>
        </div>
      )}

      {/* How it works */}
      <div className="glass-card rounded-2xl p-4 space-y-2">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">How Group Challenges Work</div>
        <div className="space-y-2 text-sm text-slate-400">
          <div className="flex gap-2"><span className="text-brand-yellow shrink-0">1.</span>Choose a mode: 🏷️ Plate Decoding, 🗺️ States, 🌟 Both, or 📅 Daily Tags</div>
          <div className="flex gap-2"><span className="text-brand-yellow shrink-0">2.</span>In Plates/Both: someone submits a plate, members guess blind for 12 hours</div>
          <div className="flex gap-2"><span className="text-brand-yellow shrink-0">3.</span>In States/Both: log the states you spot — collect the most to win!</div>
          <div className="flex gap-2"><span className="text-brand-yellow shrink-0">4.</span>In Daily: everyone does the daily challenge, fastest correct answer wins</div>
          <div className="flex gap-2"><span className="text-brand-yellow shrink-0">5.</span>Points awarded for creativity, accuracy, speed, and state collection</div>
        </div>
      </div>
    </div>
  )
}
