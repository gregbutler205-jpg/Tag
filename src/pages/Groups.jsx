import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/groups').then(({ data }) => setGroups(data)).catch(() => setGroups([])).finally(() => setLoading(false))
  }, [])

  const createGroup = async () => {
    if (!newName.trim()) return
    const { data } = await api.post('/groups', { name: newName.trim() })
    setGroups(g => [...g, data])
    setCreating(false)
    setNewName('')
  }

  const joinGroup = async () => {
    if (!joinCode.trim()) return
    const { data } = await api.post('/groups/join', { code: joinCode.trim().toUpperCase() })
    setGroups(g => [...g, data])
    setJoining(false)
    setJoinCode('')
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-4 flex items-center justify-between">
        <h1 className="text-2xl font-black">Groups</h1>
        <div className="flex gap-2">
          <button onClick={() => setJoining(true)} className="text-sm bg-slate-700 px-3 py-1.5 rounded-lg">Join</button>
          <button onClick={() => setCreating(true)} className="text-sm bg-blue-600 px-3 py-1.5 rounded-lg">+ New</button>
        </div>
      </div>

      {creating && (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
          <h2 className="font-bold">Create Group</h2>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name" className="w-full bg-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="flex-1 bg-slate-700 py-2 rounded-xl text-sm">Cancel</button>
            <button onClick={createGroup} className="flex-1 bg-blue-600 py-2 rounded-xl text-sm font-bold">Create</button>
          </div>
        </div>
      )}

      {joining && (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
          <h2 className="font-bold">Join Group</h2>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter invite code" className="w-full bg-slate-700 rounded-xl px-4 py-2 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2">
            <button onClick={() => setJoining(false)} className="flex-1 bg-slate-700 py-2 rounded-xl text-sm">Cancel</button>
            <button onClick={joinGroup} className="flex-1 bg-blue-600 py-2 rounded-xl text-sm font-bold">Join</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-center py-8 animate-pulse">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-slate-400 space-y-2">
          <div className="text-4xl">👥</div>
          <p>No groups yet. Create one or join with a code.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <Link key={g.id} to={`/groups/${g.id}`} className="flex items-center gap-4 bg-slate-800 rounded-2xl p-4 border border-slate-700 hover:border-blue-500 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">
                {g.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{g.name}</div>
                <div className="text-xs text-slate-400">{g.memberCount || 1} member{g.memberCount !== 1 ? 's' : ''} · Code: {g.code}</div>
              </div>
              {g.pendingCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{g.pendingCount}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
