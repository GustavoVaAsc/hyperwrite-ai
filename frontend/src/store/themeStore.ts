import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

export interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light'
        window.document.documentElement.setAttribute('data-theme', newTheme)
        return { theme: newTheme }
      }),
      setTheme: (theme) => {
        window.document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state?: ThemeState) => {
        if (state) window.document.documentElement.setAttribute('data-theme', state.theme)
      },
    }
  )
)