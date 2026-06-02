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

// Compute display values for an optional discount. The stored `price` is the
// FINAL price the customer pays; a positive `discountPercent` produces an
// inflated, struck-through "original" of price * (1 + pct/100).
// e.g. price 100 + 50% => { original: 150, final: 100, percent: 50 }.
export function discountInfo(price, discountPercent) {
  const final = Number(price)
  const pct = Number(discountPercent)
  if (!Number.isFinite(final)) return { hasDiscount: false, final: 0 }
  if (!Number.isFinite(pct) || pct <= 0) return { hasDiscount: false, final }
  return {
    hasDiscount: true,
    final,
    original: final * (1 + pct / 100),
    percent: Math.round(pct),
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
