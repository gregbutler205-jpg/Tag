import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useStore from '../store/useStore'
import api from '../lib/api'

export default function SignIn() {
  const [mode, setMode]       = useState('signin')   // 'signin' | 'register'
  const [username, setUsername] = useState('')
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const { setUser }           = useStore()
  const navigate              = useNavigate()

  const switchMode = (m) => { setMode(m); setError(null) }

  const handleSignIn = async () => {
    if (!username.trim()) return
    setLoading(true); setError(null)
    try {
      const { data } = await api.post('/auth/login', { username: username.trim() })
      localStorage.setItem('token', data.token)
      setUser(data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Username not found. Check spelling or create an account.')
    } finally { setLoading(false) }
  }

  const handleRegister = async () => {
    if (!username.trim() || !email.trim()) return
    setLoading(true); setError(null)
    try {
      const { data } = await api.post('/auth/register', { username: username.trim(), email: email.trim() })
      localStorage.setItem('token', data.token)
      setUser(data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create account. Try a different username.')
    } finally { setLoading(false) }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') mode === 'signin' ? handleSignIn() : handleRegister()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-10"
      style={{ background: '#04080f' }}>

      {/* Logo */}
      <img src="/logo-dark-navy.png" alt="iWonde Tag" className="h-28 mb-8 object-contain"
        onError={e => e.target.style.display = 'none'} />

      {/* Card */}
      <div className="w-full max-w-sm space-y-4">

        {/* Mode tabs */}
        <div className="flex rounded-2xl overflow-hidden border border-navy-600 bg-navy-800">
          <button onClick={() => switchMode('signin')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              mode === 'signin' ? 'bg-brand-blue text-white' : 'text-slate-500 hover:text-slate-300'
            }`}>
            Sign In
          </button>
          <button onClick={() => switchMode('register')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              mode === 'register' ? 'bg-brand-blue text-white' : 'text-slate-500 hover:text-slate-300'
            }`}>
            Create Account
          </button>
        </div>

        {/* Fields */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Username"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/40 placeholder:text-slate-600"
          />
          {mode === 'register' && (
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Email address"
              type="email"
              inputMode="email"
              className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/40 placeholder:text-slate-600"
            />
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={mode === 'signin' ? handleSignIn : handleRegister}
            disabled={loading || !username.trim() || (mode === 'register' && !email.trim())}
            className="w-full bg-brand-yellow hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-navy-900 font-black py-3 rounded-xl text-sm transition-all active:scale-[0.98]"
          >
            {loading ? '...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        {/* Guest note */}
        <p className="text-center text-slate-600 text-xs px-4">
          You can play as a guest without signing in — your points and streak are saved locally on this device.
        </p>

        {/* Back to app */}
        <div className="text-center">
          <Link to="/" className="text-slate-500 text-sm hover:text-slate-300 transition-colors">
            ← Continue as guest
          </Link>
        </div>

        {/* Privacy link */}
        <p className="text-center text-slate-700 text-xs">
          By signing in you agree to our{' '}
          <Link to="/privacy" className="text-slate-500 hover:text-slate-300 underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
