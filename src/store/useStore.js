import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
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
    }),
    { name: 'iwonde-tag-store' }
  )
)

export default useStore
