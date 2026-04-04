import { useState, useEffect } from 'react'
import BackButton from '../components/BackButton'
import api from '../lib/api'

const TABS = ['Pending', 'Full Pool']

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

export default function Admin() {
  const [activeTab, setActiveTab] = useState('Pending')
  const [pending, setPending] = useState([])
  const [pool, setPool] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    loadData()
  }, [activeTab])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'Pending') {
        const { data } = await api.get('/admin/pending')
        setPending(data || [])
      } else {
        const { data } = await api.get('/admin/pool')
        setPool(data || [])
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setAccessDenied(true)
      } else {
        setError(err.message || 'Failed to load data')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id) {
    setActionLoading(prev => ({ ...prev, [id]: 'approve' }))
    try {
      await api.post(`/admin/approve/${id}`)
      setPending(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      alert('Failed to approve: ' + (err.message || 'Unknown error'))
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }))
    }
  }

  async function handleReject(id) {
    setActionLoading(prev => ({ ...prev, [id]: 'reject' }))
    try {
      await api.post(`/admin/reject/${id}`)
      setPending(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      alert('Failed to reject: ' + (err.message || 'Unknown error'))
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }))
    }
  }

  if (accessDenied) {
    return (
      <div className="pb-nav px-4 pt-3 max-w-lg mx-auto space-y-5">
        <div className="pt-2"><BackButton to="/" /></div>
        <div className="glass-card rounded-2xl p-8 text-center space-y-3">
          <div className="text-4xl">🚫</div>
          <h2 className="text-lg font-black text-red-400">Access Denied</h2>
          <p className="text-slate-500 text-sm">You don't have admin access to this panel.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-nav px-4 pt-3 max-w-2xl mx-auto space-y-5">
      <div className="pt-2"><BackButton to="/" /></div>

      <div className="pt-1">
        <h1 className="text-2xl font-black text-white">Admin Panel</h1>
        <p className="text-slate-500 text-sm">Manage the daily plate pool</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === tab
                ? 'bg-brand-blue text-white'
                : 'bg-navy-800 text-slate-400 hover:text-white hover:bg-navy-700'
            }`}
          >
            {tab}
            {tab === 'Pending' && pending.length > 0 && !loading && (
              <span className="ml-2 bg-brand-yellow text-navy-900 text-xs font-black px-1.5 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="glass-card rounded-2xl p-4 border border-red-800/50 bg-red-950/30">
          <p className="text-red-300 text-sm">{error}</p>
          <button onClick={loadData} className="mt-2 text-xs text-brand-yellow underline">
            Try again
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm animate-pulse">Loading...</p>
        </div>
      )}

      {/* Pending Tab */}
      {!loading && !error && activeTab === 'Pending' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-slate-400 text-sm">No pending plates — queue is clear.</p>
            </div>
          ) : (
            pending.map(plate => (
              <div key={plate.id} className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-black text-lg tracking-wider">{plate.plate_text}</span>
                      {plate.state && (
                        <span className="text-xs text-slate-500 bg-navy-700 px-2 py-0.5 rounded-full">{plate.state}</span>
                      )}
                      <DifficultyBadge difficulty={plate.difficulty} />
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{plate.meaning}</p>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                      {plate.category && <span>{plate.category}</span>}
                      {plate.source && <span>Source: {plate.source}</span>}
                      {plate.users?.display_name && (
                        <span>By: <span className="text-slate-400">{plate.users.display_name}</span></span>
                      )}
                      {plate.goes_live_at && (
                        <span>Goes live: {new Date(plate.goes_live_at).toLocaleDateString()}</span>
                      )}
                      {plate.pending_since && (
                        <span>Pending since: {new Date(plate.pending_since).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(plate.id)}
                    disabled={!!actionLoading[plate.id]}
                    className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading[plate.id] === 'approve' ? 'Approving...' : '✅ Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(plate.id)}
                    disabled={!!actionLoading[plate.id]}
                    className="flex-1 py-2 rounded-xl bg-red-900 hover:bg-red-800 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading[plate.id] === 'reject' ? 'Rejecting...' : '❌ Reject'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Full Pool Tab */}
      {!loading && !error && activeTab === 'Full Pool' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{pool.length} plates in pool</p>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Plate</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-400">Meaning</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Category</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Difficulty</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Rarity</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Status</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Shown</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 whitespace-nowrap">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {pool.map((plate, idx) => (
                    <tr
                      key={plate.id}
                      className={`border-b border-navy-800/50 hover:bg-navy-700/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-navy-800/20'}`}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-white font-black tracking-wide text-xs whitespace-nowrap">{plate.plate_text}</span>
                          {plate.state && <span className="text-slate-600 text-xs">{plate.state}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-xs max-w-xs">
                        <span className="line-clamp-2">{plate.meaning}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">{plate.category || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <DifficultyBadge difficulty={plate.difficulty} />
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap capitalize">{plate.rarity || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusBadge status={plate.status} />
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">{plate.times_shown ?? 0}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{plate.source || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
