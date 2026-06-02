import { supabase } from './supabase'

// Records a single page view for a product. Fire-and-forget: visitors are
// anonymous and we never want analytics to block or break the public page.
//
// We de-duplicate per browser session so that a refresh, a back-button return,
// or React StrictMode's double mount in dev doesn't inflate the count. The
// guard lives in sessionStorage, so a brand-new visit (new tab/session) counts
// again — which is the behaviour you want for "how many people viewed this".
export async function recordProductView(productId) {
  if (!productId) return

  const key = `pv:${productId}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    // sessionStorage can throw in private mode / sandboxed iframes — just count.
  }

  try {
    await supabase.from('product_views').insert({ product_id: productId })
  } catch {
    // Swallow: a failed analytics write must never surface to the visitor.
  }
}

// Returns an array of the last `days` calendar days (oldest → newest), each
// `{ key, label, date, count }`, with view rows bucketed into the day they
// happened (local time). Used to draw the "views over time" chart.
export function bucketViewsByDay(rows, days = 14) {
  const buckets = []
  const index = new Map()
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    const bucket = {
      key,
      date: d,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: 0,
    }
    buckets.push(bucket)
    index.set(key, bucket)
  }

  for (const row of rows || []) {
    const bucket = index.get(dayKey(new Date(row.created_at)))
    if (bucket) bucket.count += 1
  }

  return buckets
}

// Local-day identity key (YYYY-MM-DD in the browser's timezone).
function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
