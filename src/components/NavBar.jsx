import { NavLink } from 'react-router-dom'

const links = [
  { to: '/',           icon: '🏠', label: 'Home' },
  { to: '/daily',      icon: '🏷️', label: 'Daily' },
  { to: '/submit',     icon: '📸', label: 'Submit' },
  { to: '/groups',     icon: '👥', label: 'Groups' },
  { to: '/collection', icon: '🗺️', label: 'Map' },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex justify-around py-2 z-50">
      {links.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center text-xs gap-0.5 px-2 py-1 rounded-lg transition-colors ${
              isActive ? 'text-blue-400' : 'text-slate-400'
            }`
          }
        >
          <span className="text-xl">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
