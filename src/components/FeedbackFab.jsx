/**
 * FeedbackFab — floating action button linking to /feedback
 * Sits bottom-right, above the nav bar, on the Home screen.
 */
import { Link } from 'react-router-dom'

export default function FeedbackFab() {
  return (
    <Link
      to="/feedback"
      title="Send Feedback"
      className="fixed z-30 flex items-center gap-2 shadow-lg transition-all active:scale-95 hover:brightness-110"
      style={{
        bottom: '88px',   // just above the nav bar
        right: '16px',
        background: 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
        border: '1.5px solid rgba(245,196,0,0.35)',
        borderRadius: '999px',
        padding: '10px 16px',
        boxShadow: '0 4px 20px rgba(26,86,219,0.45)',
      }}
    >
      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 flex-shrink-0">
        <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223 3.73 3.73 0 003.26-.814l-.5.734z" clipRule="evenodd"/>
      </svg>
      <span className="text-white text-sm font-bold whitespace-nowrap">Feedback</span>
    </Link>
  )
}
