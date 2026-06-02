import { useState } from 'react'

function Star({ filled, className = '' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77 4.8 17.5l.99-5.79L1.58 7.62l5.82-.85L10 1.5z"
      />
    </svg>
  )
}

// Interactive (when onChange given) or read-only star rating, 1–5.
export default function StarRating({
  value = 0,
  onChange,
  size = 'md',
  readOnly = false,
}) {
  const [hover, setHover] = useState(0)
  const interactive = !readOnly && typeof onChange === 'function'
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-7 w-7' }
  const starClass = sizes[size] || sizes.md
  const shown = hover || value

  return (
    <div
      className="flex items-center gap-1 text-amber-400"
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Star rating' : `Rated ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) =>
        interactive ? (
          <button
            key={n}
            type="button"
            className="rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(value === n ? 0 : n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-pressed={value === n}
          >
            <Star filled={n <= shown} className={starClass} />
          </button>
        ) : (
          <Star key={n} filled={n <= shown} className={starClass} />
        )
      )}
    </div>
  )
}
