// Format a numeric price. Defaults to Indian Rupees; falls back gracefully.
export function formatPrice(value, currency = 'INR', locale = 'en-IN') {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n)
  } catch {
    return `₹${n}`
  }
}

// Human "x minutes ago" style relative time from an ISO timestamp.
export function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 5) return 'just now'

  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ]
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs || unit === 'second') {
      return rtf.format(-Math.round(seconds / secs), unit)
    }
  }
  return ''
}
