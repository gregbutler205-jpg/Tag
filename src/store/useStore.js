import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => { localStorage.removeItem('token'); set({ user: null }) },
      points: 0,
      addPoints: (n) => set((s) => ({ points: s.points + n })),
      statesCollected: [],
      addState: (abbr) => set((s) =>
        s.statesCollected.includes(abbr)
          ? s
          : { statesCollected: [...s.statesCollected, abbr] }
      ),
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
      lastSharedDate: null,
      recordShare: () => {
        const today = new Date().toDateString()
        if (get().lastSharedDate === today) return false
        set({ lastSharedDate: today })
        get().addPoints(50)
        return true
      },
    }),
    { name: 'iwonde-tag-store' }
  )
)

export default useStore
