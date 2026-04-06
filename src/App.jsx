import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import api from './lib/api'
import Header from './components/Header'
import NavBar from './components/NavBar'
import SplashScreen from './components/SplashScreen'
import WelcomeModal from './components/WelcomeModal'
import useStore from './store/useStore'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Daily from './pages/Daily'
import Groups from './pages/Groups'
import GroupRoom from './pages/GroupRoom'
import Collection from './pages/Collection'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Help from './pages/Help'
import Privacy from './pages/Privacy'
import SignIn from './pages/SignIn'
import Admin from './pages/Admin'
import Feedback from './pages/Feedback'

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const { hasSeenWelcome, setUser, setPoints, setStatesCollected } = useStore()

  // On every app launch, if the user is signed in, pull their authoritative
  // points + states from the DB so all devices stay in sync
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    api.get('/auth/me')
      .then(({ data }) => {
        setUser({ id: data.id, name: data.name, email: data.email })
        setPoints(data.points)
        setStatesCollected(data.statesCollected)
      })
      .catch(() => {
        // Expired / invalid token — clear it silently
        localStorage.removeItem('token')
      })
  }, [])

  return (
    <div className="min-h-screen text-white" style={{ background: '#04080f' }}>

      {/* Header is always mounted so FLIP can target data-splash-target */}
      <Header logoVisible={splashDone} />

      {/* Page content fades in after splash */}
      <div style={{
        opacity: splashDone ? 1 : 0,
        transition: splashDone ? 'opacity 0.35s ease' : 'none',
      }}>
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/submit"     element={<Submit />} />
          <Route path="/daily"      element={<Daily />} />
          <Route path="/groups"     element={<Groups />} />
          <Route path="/groups/:id" element={<GroupRoom />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile"    element={<Profile />} />
          <Route path="/help"       element={<Help />} />
          <Route path="/privacy"    element={<Privacy />} />
          <Route path="/signin"     element={<SignIn />} />
          <Route path="/admin"      element={<Admin />} />
          <Route path="/feedback"   element={<Feedback />} />
        </Routes>
        <NavBar />
      </div>

      {/* Splash overlay — removed once animation completes */}
      {!splashDone && (
        <SplashScreen onComplete={() => setSplashDone(true)} />
      )}

      {/* Welcome modal — shown once on first ever visit */}
      {splashDone && !hasSeenWelcome && <WelcomeModal />}
    </div>
  )
}
