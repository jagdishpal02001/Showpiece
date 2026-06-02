import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'nefits-theme'
const ThemeContext = createContext({ theme: 'dark', setTheme: () => { }, toggle: () => { } })

// Default is dark. A stored preference (set via the toggle) always wins.
function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* localStorage may be unavailable (private mode) — fall through */
  }
  return 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#020617' : '#ffffff')
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore persistence failures */
    }
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
