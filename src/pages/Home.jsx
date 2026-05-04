import { useState } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import SafetyBanner from '../components/SafetyBanner'
import FeedbackFab from '../components/FeedbackFab'

function StatCard({ icon, value, label }) {
  return (
    <div className="glass-card rounded-2xl p-4 text-center flex flex-col items-center gap-1">
      <span className="text-2xl">{icon}</span>
      <span className="text-2xl font-black text-white leading-none">{value}</span>
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
    </div>
  )
}

function ActionCard({ to, emoji, title, subtitle, accent = false }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-4 rounded-2xl p-4 transition-all active:scale-[0.98] ${
        accent
          ? 'bg-gradient-to-r from-brand-blue to-brand-blue-light border border-brand-blue-light/30 shadow-glow'
          : 'glass-card hover:border-navy-500'
      }`}
    >
      <span className="text-3xl w-10 text-center shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white">{title}</div>
        <div className={`text-sm truncate ${accent ? 'text-blue-200' : 'text-slate-500'}`}>{subtitle}</div>
      </div>
      <svg viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 shrink-0 ${accent ? 'text-blue-200' : 'text-slate-600'}`}>
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
      </svg>
    </Link>
  )
}

export default function Home() {
  const { points, streak, statesCollected, hasEverShared, recordShare } = useStore()
  const [shareMsg, setShareMsg] = useState('')

  async function handleShare() {
    const subject = 'Check out Tag Wizard!'
    const body = [
      'Join me on Tag Wizard — spot vanity license plates, decode their hidden meanings, collect all 50 states, and compete with friends! 🏷️',
      '',
      'To install the free app on your phone:',
      '• iPhone: open tag.iwonde.com in Safari → tap the Share icon (box with arrow) → "Add to Home Screen"',
      '• Android: open tag.iwonde.com in Chrome → tap the menu (three dots) → "Add to Home Screen"',
      '',
      'Play here: https://tag.iwonde.com',
    ].join('\n')

    try {
      if (navigator.share) {
        // Mobile: use native share sheet
        await navigator.share({ title: 'Tag Wizard', text: body, url: 'https://tag.iwonde.com' })
      } else {
        // Desktop: open email client with subject + full message pre-filled and editable
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      }
      const result = recordShare()
      setShareMsg(result === 'first' ? '+50 pts! Thanks for sharing 🎉' : 'Thanks for spreading the word! 🎉')
    } catch {
      // User cancelled — no message
    }
    setTimeout(() => setShareMsg(''), 3000)
  }

  return (
    <div className="pb-nav max-w-lg mx-auto">
      <SafetyBanner />

      <div className="px-4 pt-5 space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="⭐" value={points.toLocaleString()} label="Points" />
        <StatCard icon="🔥" value={streak > 0 ? `${streak}d` : '—'} label="Streak" />
        <StatCard icon="🗺️" value={`${statesCollected.length}/51`} label="States" />
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <ActionCard
          to="/daily"
          emoji="🏷️"
          title="Tag of the Day"
          subtitle="Today's plate challenge — earn bonus pts"
          accent
        />
        <ActionCard
          to="/submit"
          emoji="📸"
          title="Submit a Plate"
          subtitle="Camera capture or manual entry"
        />
        <ActionCard
          to="/groups"
          emoji="👥"
          title="Group Challenges"
          subtitle="Compete blind with friends"
        />
        <ActionCard
          to="/leaderboard"
          emoji="🏆"
          title="Leaderboard"
          subtitle="See where you rank globally"
        />
        <ActionCard
          to="/collection"
          emoji="🗺️"
          title="State Collection"
          subtitle={`${statesCollected.length} of 51 collected`}
        />

        {/* Share the App */}
        <button
          onClick={handleShare}
          className="w-full flex items-center gap-4 rounded-2xl p-4 transition-all active:scale-[0.98] glass-card hover:border-navy-500"
        >
          <span className="text-3xl w-10 text-center shrink-0">📣</span>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-bold text-white">Share the App</div>
            <div className="text-sm text-slate-500 truncate">
              {shareMsg || (hasEverShared ? 'Share with friends anytime' : 'Earn +50 pts on your first share')}
            </div>
          </div>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 text-slate-600">
            <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.474l6.733-3.366A2.5 2.5 0 0113 4.5z"/>
          </svg>
        </button>
      </div>

      </div>

      <FeedbackFab />
    </div>
  )
}
