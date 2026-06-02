import { BRAND } from '../lib/seo'

// The Nefits wordmark + logo glyph. Used in headers, the login screen and
// footers so the brand shows up consistently everywhere.
export default function Brand({ size = 'md', showName = true, className = '' }) {
  const glyph = {
    sm: 'h-7 w-7 rounded-lg',
    md: 'h-9 w-9 rounded-xl',
    lg: 'h-12 w-12 rounded-2xl',
  }[size]
  const icon = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-6 w-6' }[size]
  const text = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }[size]

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`relative flex flex-none items-center justify-center bg-gradient-to-br from-brand-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-brand-500/30 ${glyph}`}
        aria-hidden="true"
      >
        {/* Stylised "N" / grid glyph */}
        <svg viewBox="0 0 20 20" fill="currentColor" className={icon}>
          <path d="M4 16V4a1 1 0 0 1 1.78-.62l8.22 10.2V4a1 1 0 1 1 2 0v12a1 1 0 0 1-1.78.62L6 6.42V16a1 1 0 1 1-2 0z" />
        </svg>
      </span>
      {showName && (
        <span className={`font-extrabold tracking-tight ${text}`}>
          <span className="text-gradient-brand">{BRAND}</span>
        </span>
      )}
    </span>
  )
}
