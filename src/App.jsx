import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Daily from './pages/Daily'
import Groups from './pages/Groups'
import GroupRoom from './pages/GroupRoom'
import Collection from './pages/Collection'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupRoom />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <NavBar />
    </div>
  )
}
