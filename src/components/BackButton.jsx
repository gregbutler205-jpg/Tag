import { useNavigate } from 'react-router-dom'

export default function BackButton({ to = -1, className = '' }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => typeof to === 'number' ? navigate(to) : navigate(to)}
      className={`flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors ${className}`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
      </svg>
      <span className="text-sm font-semibold">Back</span>
    </button>
  )
}
