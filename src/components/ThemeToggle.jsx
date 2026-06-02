import { useTheme } from '../lib/theme'

// Animated light/dark switch. Sun/moon crossfade + rotate on toggle.
export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-brand-400 hover:text-brand-600 active:scale-90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-300 ${className}`}
    >
      {/* Sun */}
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`absolute h-5 w-5 transition-all duration-300 ${
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        }`}
      >
        <path d="M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7-4a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zM5 10a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zm10.07-5.07a1 1 0 0 1 0 1.41l-.7.71a1 1 0 1 1-1.42-1.42l.71-.7a1 1 0 0 1 1.41 0zM6.05 13.95a1 1 0 0 1 0 1.41l-.71.71a1 1 0 0 1-1.41-1.42l.7-.7a1 1 0 0 1 1.42 0zm9.02 1.41a1 1 0 0 1-1.42 0l-.7-.7a1 1 0 0 1 1.41-1.42l.71.71a1 1 0 0 1 0 1.41zM6.05 6.05a1 1 0 0 1-1.42 0l-.7-.71a1 1 0 0 1 1.41-1.41l.71.7a1 1 0 0 1 0 1.42zM10 16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1z" />
      </svg>
      {/* Moon */}
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`absolute h-5 w-5 transition-all duration-300 ${
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        }`}
      >
        <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586z" />
      </svg>
    </button>
  )
}
