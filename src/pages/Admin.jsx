import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton'
import api from '../lib/api'

const TABS = ['Pending', 'Pool', 'Plates', 'Users', 'Groups', 'Feedback']

const STATUS_BADGE = {
  approved: 'bg-emerald-800/60 text-emerald-300 border border-emerald-700/50',
  pending:  'bg-yellow-800/60 text-yellow-300 border border-yellow-700/50',
  rejected: 'bg-red-900/60 text-red-300 border border-red-800/50',
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[status] || 'bg-navy-700 text-slate-400'}`}>
      {status}
    </span>
  )
}

function DifficultyBadge({ difficulty }) {
  const colors = {
    easy:      'text-slate-400',
    medium:    'text-yellow-400',
    hard:      'text-orange-400',
    legendary: 'text-purple-400',
  }
  return (
    <span className={`text-xs font-bold capitalize ${colors[difficulty] || 'text-slate-400'}`}>
      {difficulty}
    </span>
  )
}

function DeleteBtn({ onDelete, label = '🗑 Delete', loading }) {
  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-300 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-red-800/50"
    >
      {loading ? '...' : label}
    </button>
  )
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState('Pending')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => { loadData() }, [activeTab])

  const ENDPOINT = {
    'Pending':  '/admin/pending',
    'Pool':     '/admin/pool',
    'Plates':   '/admin/submissions',
    'Users':    '/admin/users-list',
    'Groups':   '/admin/groups-list',
    'Feedback': '/admin/feedback-list',
  }

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: rows } = await api.get(ENDPOINT[activeTab])
      setData(rows || [])
    } catch (err) {
      if (err.response?.status === 403) setAccessDenied(true)
      else setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function doAction(id, path, method = 'POST') {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      if (method === 'DELETE') await api.delete(path)
      else await api.post(path)
      setData(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      alert('Action failed: ' + (err.message || 'Unknown error'))
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  function confirmDelete(id, path, label) {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return
    doAction(id, path, 'DELETE')
  }

  // Check if user is even logged in (no token = definitely not admin)
  const isLoggedIn = !!localStorage.getItem('token')

  if (!isLoggedIn || accessDenied) {
    return (
      <div className="pb-nav px-4 pt-3 max-w-lg mx-auto space-y-5">
        <div className="pt-2"><BackButton to="/" /></div>
        <div className="glass-card rounded-2xl p-10 text-center space-y-5 border border-navy-600">
          <div className="text-6xl">🧙‍♂️</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Nothing to see here.</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Move along. These aren't the droids you're looking for.
            </p>
          </div>
          <div className="w-16 h-px bg-navy-600 mx-auto" />
          <p className="text-slate-600 text-xs">
            {!isLoggedIn
              ? 'You need to be signed in — and even then, probably not.'
              : "Nice try. This area is for the wizard behind the curtain only."}
          </p>
          <Link
            to="/"
            className="inline-block bg-brand-blue hover:bg-brand-blue-light text-white font-bold px-6 py-2.5 rounded-xl transition-all text-sm"
          >
            Take me back
          </Link>
        </div>
      </div>
    )
  }

  const pendingCount = activeTab === 'Pending' ? data.length : 0

  return (
    <div className="pb-nav px-4 pt-3 max-w-3xl mx-auto space-y-4">
      <div className="pt-2"><BackButton to="/" /></div>

      <div className="pt-1">
        <h1 className="text-2xl font-black text-white">Admin Panel</h1>
        <p className="text-slate-500 text-sm">Manage content, users, and moderation</p>
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === tab
                ? 'bg-brand-blue text-white'
                : 'bg-navy-800 text-slate-400 hover:text-white hover:bg-navy-700'
            }`}
          >
            {tab}
            {tab === 'Pending' && pendingCount > 0 && !loading && (
              <span className="ml-1.5 bg-brand-yellow text-navy-900 text-xs font-black px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card rounded-2xl p-4 border border-red-800/50 bg-red-950/30">
          <p className="text-red-300 text-sm">{error}</p>
          <button onClick={loadData} className="mt-2 text-xs text-brand-yellow underline">Try again</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm animate-pulse">Loading...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── PENDING ─────────────────────────────────────────────────── */}
          {activeTab === 'Pending' && (
            <div className="space-y-3">
              {data.length === 0 ? (
                <Empty emoji="✅" text="No pending plates — queue is clear." />
              ) : data.map(plate => (
                <div key={plate.id} className="glass-card rounded-2xl p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-black text-lg tracking-wider">{plate.plate_text}</span>
                      {plate.state && <span className="text-xs text-slate-500 bg-navy-700 px-2 py-0.5 rounded-full">{plate.state}</span>}
                      <DifficultyBadge difficulty={plate.difficulty} />
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{plate.meaning}</p>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                      {plate.category && <span>{plate.category}</span>}
                      {plate.source && <span>Source: {plate.source}</span>}
                      {plate.users?.display_name && <span>By: <span className="text-slate-400">{plate.users.display_name}</span></span>}
                      {plate.goes_live_at && <span>Goes live: {new Date(plate.goes_live_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => doAction(plate.id, `/admin/approve/${plate.id}`)}
                      disabled={!!actionLoading[plate.id]}
                      className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      {actionLoading[plate.id] ? '...' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => doAction(plate.id, `/admin/reject/${plate.id}`)}
                      disabled={!!actionLoading[plate.id]}
                      className="flex-1 py-2 rounded-xl bg-red-900 hover:bg-red-800 text-white text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      {actionLoading[plate.id] ? '...' : '❌ Reject'}
                    </button>
                    <button
                      onClick={() => confirmDelete(plate.id, `/admin/pool/${plate.id}`, 'plate')}
                      disabled={!!actionLoading[plate.id]}
                      className="px-3 py-2 rounded-xl bg-navy-700 hover:bg-navy-600 text-slate-400 text-sm font-bold transition-colors disabled:opacity-50"
                      title="Permanently delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── POOL ────────────────────────────────────────────────────── */}
          {activeTab === 'Pool' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">{data.length} plates in pool</p>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-navy-700">
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-400">Plate</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-400">Meaning</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Difficulty</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Status</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Shown</th>
                        <th className="px-3 py-2 text-xs font-bold text-slate-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((plate, idx) => (
                        <tr key={plate.id} className={`border-b border-navy-800/50 hover:bg-navy-700/30 ${idx % 2 === 0 ? '' : 'bg-navy-800/20'}`}>
                          <td className="px-3 py-2">
                            <div>
                              <span className="text-white font-black tracking-wide text-xs">{plate.plate_text}</span>
                              {plate.state && <span className="text-slate-600 text-xs ml-1">{plate.state}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-400 text-xs max-w-[180px]">
                            <span className="line-clamp-2">{plate.meaning}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap"><DifficultyBadge difficulty={plate.difficulty} /></td>
                          <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={plate.status} /></td>
                          <td className="px-3 py-2 text-slate-400 text-xs">{plate.times_shown ?? 0}</td>
                          <td className="px-3 py-2 text-right">
                            <DeleteBtn
                              loading={!!actionLoading[plate.id]}
                              onDelete={() => confirmDelete(plate.id, `/admin/pool/${plate.id}`, 'plate')}
                              label="🗑"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── PLATES (submissions) ─────────────────────────────────────── */}
          {activeTab === 'Plates' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">{data.length} submissions (most recent first)</p>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-navy-700">
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-400">Plate</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-400">Interpretation</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">User</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Rarity</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Date</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((plate, idx) => (
                        <tr key={plate.id} className={`border-b border-navy-800/50 hover:bg-navy-700/30 ${idx % 2 === 0 ? '' : 'bg-navy-800/20'}`}>
                          <td className="px-3 py-2">
                            <span className="text-white font-black tracking-wide text-xs">{plate.text}</span>
                            {plate.state && <span className="text-slate-600 text-xs ml-1">{plate.state}</span>}
                            {plate.has_photo && <span className="text-xs ml-1">📸</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-400 text-xs max-w-[180px]">
                            <span className="line-clamp-2">{plate.ai_primary}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">{plate.users?.display_name || '—'}</td>
                          <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap capitalize">{plate.rarity || '—'}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">
                            {new Date(plate.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <DeleteBtn
                              loading={!!actionLoading[plate.id]}
                              onDelete={() => confirmDelete(plate.id, `/admin/submissions/${plate.id}`, 'submission')}
                              label="🗑"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ───────────────────────────────────────────────────── */}
          {activeTab === 'Users' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">{data.length} users</p>
              <div className="space-y-2">
                {data.map(u => (
                  <div key={u.id} className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-dark flex items-center justify-center text-sm font-black text-white flex-shrink-0">
                      {u.display_name?.slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate">{u.display_name}</div>
                      <div className="text-xs text-slate-500">
                        {u.total_points?.toLocaleString() || 0} pts &nbsp;·&nbsp; joined {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <DeleteBtn
                      loading={!!actionLoading[u.id]}
                      onDelete={() => confirmDelete(u.id, `/admin/users/${u.id}`, 'user')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GROUPS ──────────────────────────────────────────────────── */}
          {activeTab === 'Groups' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">{data.length} groups</p>
              <div className="space-y-2">
                {data.map(g => (
                  <div key={g.id} className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="text-2xl flex-shrink-0">👥</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate">{g.name}</div>
                      <div className="text-xs text-slate-500">
                        Code: <span className="font-mono text-slate-400">{g.code}</span>
                        &nbsp;·&nbsp; Owner: {g.users?.display_name || '—'}
                        &nbsp;·&nbsp; Mode: {g.mode || 'plates'}
                      </div>
                    </div>
                    <DeleteBtn
                      loading={!!actionLoading[g.id]}
                      onDelete={() => confirmDelete(g.id, `/admin/groups/${g.id}`, 'group')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FEEDBACK ────────────────────────────────────────────────── */}
          {activeTab === 'Feedback' && (
            <div className="space-y-3">
              {data.length === 0 ? (
                <Empty emoji="💬" text="No feedback submitted yet." />
              ) : data.map(fb => (
                <div key={fb.id} className="glass-card rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                          fb.type === 'bug'        ? 'bg-red-900/60 text-red-300 border border-red-800/50' :
                          fb.type === 'suggestion' ? 'bg-blue-900/60 text-blue-300 border border-blue-800/50' :
                          fb.type === 'content'    ? 'bg-orange-900/60 text-orange-300 border border-orange-800/50' :
                          'bg-navy-700 text-slate-400'
                        }`}>{fb.type}</span>
                        {fb.users?.display_name && (
                          <span className="text-xs text-slate-500">from <span className="text-slate-400">{fb.users.display_name}</span></span>
                        )}
                        <span className="text-xs text-slate-600">{new Date(fb.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{fb.message}</p>
                      {fb.contact && (
                        <p className="text-xs text-slate-500">Contact: <span className="text-slate-400">{fb.contact}</span></p>
                      )}
                    </div>
                    <DeleteBtn
                      loading={!!actionLoading[fb.id]}
                      onDelete={() => confirmDelete(fb.id, `/admin/feedback/${fb.id}`, 'feedback')}
                      label="🗑"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Empty({ emoji, text }) {
  return (
    <div className="glass-card rounded-2xl p-8 text-center">
      <div className="text-3xl mb-2">{emoji}</div>
      <p className="text-slate-400 text-sm">{text}</p>
    </div>
  )
}
