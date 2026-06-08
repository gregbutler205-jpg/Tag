import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, points: 0, statesCollected: [], avatarBase64: null })
      },
      hasSeenWelcome: false,
      setHasSeenWelcome: (v) => set({ hasSeenWelcome: v }),
      avatarBase64: null,
      setAvatar: (b64) => set({ avatarBase64: b64 }),

      // ── Points ─────────────────────────────────────────────────────────────
      points: 0,
      // setPoints: overwrite with authoritative DB value on sync
      setPoints: (n) => set({ points: n }),
      // addPoints: update local immediately + sync delta to DB (fire-and-forget)
      addPoints: (n) => {
        if (!n || n <= 0) return
        set((s) => ({ points: s.points + n }))
        if (localStorage.getItem('token')) {
          api.post('/auth/sync-points', { delta: n }).catch(() => {})
        }
      },

      // ── States ─────────────────────────────────────────────────────────────
      statesCollected: [],
      // setStatesCollected: overwrite with authoritative DB list on sync
      setStatesCollected: (arr) => set({ statesCollected: arr }),
      addState: (abbr) => set((s) =>
        s.statesCollected.includes(abbr)
          ? s
          : { statesCollected: [...s.statesCollected, abbr] }
      ),

      // ── Streak ─────────────────────────────────────────────────────────────
      streak: 0,
      lastDailyDate: null,
      markDailyDone: () => {
        const today = new Date().toDateString()
        const last = get().lastDailyDate
        set({
          lastDailyDate: today,
          streak: last === new Date(Date.now() - 86400000).toDateString()
            ? get().streak + 1
            : 1
        })
      },

      // ── Sharing ────────────────────────────────────────────────────────────
      hasEverShared: false,
      recordShare: () => {
        if (!get().hasEverShared) {
          set({ hasEverShared: true })
          get().addPoints(50)
          return 'first'
        }
        return 'shared'
      },
    }),
    { name: 'iwonde-tag-store' }
  )
)

export default useStore
