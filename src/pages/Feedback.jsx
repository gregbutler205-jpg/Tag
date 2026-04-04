import { useState } from 'react'
import BackButton from '../components/BackButton'
import api from '../lib/api'

const TYPES = [
  { value: 'bug',        label: '🐛 Bug Report',   desc: 'Something is broken or not working' },
  { value: 'suggestion', label: '💡 Suggestion',    desc: 'Feature request or improvement idea' },
  { value: 'content',    label: '🚩 Report Content', desc: 'Offensive or inappropriate tag / content' },
  { value: 'other',      label: '💬 Other',          desc: 'General feedback or questions' },
]

export default function Feedback() {
  const [type, setType] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim() || message.trim().length < 5) {
      setError('Please write at least a sentence so we can help you.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await api.post('/feedback', { type, message: message.trim(), contact: contact.trim() || undefined })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send — please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="pb-nav px-4 pt-3 max-w-lg mx-auto space-y-5">
        <div className="pt-2"><BackButton to="/help" /></div>
        <div className="glass-card rounded-2xl p-10 text-center space-y-4">
          <div className="text-5xl">🙏</div>
          <h2 className="text-xl font-black text-white">Thanks for your feedback!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            We read every message and use it to make iWonde Tag better.
            {contact ? ' We\'ll be in touch if we have questions.' : ''}
          </p>
          <button
            onClick={() => { setSent(false); setMessage(''); setContact('') }}
            className="text-brand-yellow text-sm font-bold underline"
          >
            Send another message
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-nav px-4 pt-3 max-w-lg mx-auto space-y-5">
      <div className="pt-2"><BackButton to="/help" /></div>

      <div className="pt-1">
        <h1 className="text-2xl font-black text-white">Send Feedback</h1>
        <p className="text-slate-500 text-sm">Help us improve iWonde Tag</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Type selector */}
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">What kind of feedback?</p>
          <div className="space-y-2">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  type === t.value
                    ? 'bg-brand-blue/20 border-brand-blue text-white'
                    : 'bg-navy-800/50 border-navy-700 text-slate-400 hover:border-navy-500'
                }`}
              >
                <div className="font-bold text-sm">{t.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Describe the issue, idea, or content you'd like to report..."
            rows={5}
            maxLength={2000}
            className="w-full bg-navy-800/60 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-blue resize-none"
          />
          <div className="text-right text-xs text-slate-600">{message.length}/2000</div>
        </div>

        {/* Optional contact */}
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            Contact (optional)
          </label>
          <input
            type="text"
            value={contact}
            onChange={e => setContact(e.target.value)}
            placeholder="Email or username — only if you want a reply"
            maxLength={100}
            className="w-full bg-navy-800/60 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-blue"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-950/50 border border-red-800/50">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="w-full py-3.5 rounded-2xl bg-brand-blue hover:bg-brand-blue-light text-white font-black text-base transition-all shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending...' : '📤 Send Feedback'}
        </button>
      </form>
    </div>
  )
}
