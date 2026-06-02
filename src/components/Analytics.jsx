import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { bucketViewsByDay } from '../lib/analytics'

const RANGES = [
  { days: 7, label: '7d' },
  { days: 14, label: '14d' },
  { days: 30, label: '30d' },
]

// Owner-only analytics panel for the dashboard. Fetches recent view rows once
// and renders them as responsive stat cards, a views-over-time chart, and a
// top-products bar list. Designed mobile-first — everything reflows to a single
// column and the chart scales fluidly via an SVG viewBox.
export default function Analytics({ products }) {
  const [rows, setRows] = useState(null) // recent product_views rows (last 30d)
  const [error, setError] = useState('')
  const [days, setDays] = useState(14)

  useEffect(() => {
    let active = true
    const since = new Date()
    since.setDate(since.getDate() - 30)
    ;(async () => {
      const { data, error: err } = await supabase
        .from('product_views')
        .select('product_id, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })
      if (!active) return
      if (err) setError(err.message)
      else setRows(data || [])
    })()
    return () => {
      active = false
    }
  }, [])

  // Per-product all-time totals come from the products prop (product_views(count)).
  const totals = useMemo(() => {
    const list = (products || []).map((p) => ({
      id: p.id,
      title: p.title,
      count: p.product_views?.[0]?.count ?? 0,
    }))
    const all = list.reduce((s, p) => s + p.count, 0)
    return { list, all }
  }, [products])

  const buckets = useMemo(() => bucketViewsByDay(rows || [], days), [rows, days])
  const rangeTotal = useMemo(() => buckets.reduce((s, b) => s + b.count, 0), [buckets])
  const avgPerDay = buckets.length ? rangeTotal / buckets.length : 0

  const topProducts = useMemo(
    () => [...totals.list].sort((a, b) => b.count - a.count).slice(0, 5),
    [totals.list]
  )
  const topMax = topProducts[0]?.count || 0

  const loading = rows === null && !error

  return (
    <section className="mb-6 animate-fade-up">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 011 1v11h12a1 1 0 110 2H4a2 2 0 01-2-2V4a1 1 0 011-1z"/><path d="M7 11a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zm3-3a1 1 0 011-1h.01a1 1 0 110 2H11a1 1 0 01-1-1zm3-3a1 1 0 011-1h.01a1 1 0 110 2H14a1 1 0 01-1-1z"/></svg>
          </span>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 sm:text-lg">Analytics</h2>
        </div>

        {/* Range toggle */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-lg px-2.5 py-1 transition ${
                days === r.days
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              aria-pressed={days === r.days}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          Couldn’t load analytics: {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:col-span-3">
            <Stat label="Total views" value={totals.all} loading={loading} accent />
            <Stat label={`Views · last ${days}d`} value={rangeTotal} loading={loading} />
            <Stat label="Avg / day" value={round1(avgPerDay)} loading={loading} />
            <Stat label="Products" value={(products || []).length} loading={loading} />
          </div>

          {/* Views over time */}
          <div className="rounded-2xl surface p-4 lg:col-span-2">
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Views over time</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">last {days} days</span>
            </div>
            {loading ? (
              <div className="h-[180px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ) : (
              <ViewsChart buckets={buckets} />
            )}
          </div>

          {/* Top products */}
          <div className="rounded-2xl surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Top products</h3>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : topMax === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No views yet.</p>
            ) : (
              <ul className="space-y-3">
                {topProducts.map((p, i) => (
                  <li key={p.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                        <span className="mr-1.5 text-slate-400 dark:text-slate-500">{i + 1}.</span>
                        {p.title}
                      </span>
                      <span className="flex-none font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {p.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-[width] duration-700 ease-out"
                        style={{ width: `${Math.max((p.count / topMax) * 100, p.count > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function Stat({ label, value, loading, accent = false }) {
  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 ${
        accent
          ? 'border-transparent bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-lg shadow-brand-600/25'
          : 'surface'
      }`}
    >
      <p className={`text-xs font-medium ${accent ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </p>
      {loading ? (
        <div className={`mt-1.5 h-7 w-12 animate-pulse rounded-md ${accent ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`} />
      ) : (
        <p className={`mt-0.5 text-2xl font-extrabold tabular-nums sm:text-3xl ${accent ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
    </div>
  )
}

// Responsive SVG area + line chart. Uses a fixed viewBox and scales to its
// container width, so it looks crisp on any phone. Tap/hover reveals the value
// for the nearest day.
function ViewsChart({ buckets }) {
  const W = 320
  const H = 140
  const PAD = { top: 12, right: 6, bottom: 22, left: 6 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const [active, setActive] = useState(null)
  const svgRef = useRef(null)

  const max = Math.max(1, ...buckets.map((b) => b.count))
  const n = buckets.length

  const x = (i) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v) => PAD.top + innerH - (v / max) * innerH

  const points = buckets.map((b, i) => [x(i), y(b.count)])
  const linePath = points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ')
  const areaPath =
    points.length > 0
      ? `${linePath} L${x(n - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`
      : ''

  // Sparse x labels so they never overlap on a narrow screen.
  const labelStep = Math.ceil(n / 5)

  function handleMove(e) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches?.[0]?.clientX ?? e.clientX
    const rel = ((clientX - rect.left) / rect.width) * W
    let nearest = 0
    let best = Infinity
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x(i) - rel)
      if (d < best) {
        best = d
        nearest = i
      }
    }
    setActive(nearest)
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-[180px] w-full touch-none select-none overflow-visible"
        preserveAspectRatio="none"
        onPointerMove={handleMove}
        onPointerDown={handleMove}
        onPointerLeave={() => setActive(null)}
        role="img"
        aria-label={`Views over the last ${n} days`}
      >
        <defs>
          <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="viewsLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(99 102 241)" />
            <stop offset="100%" stopColor="rgb(139 92 246)" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + innerH - t * innerH}
            y2={PAD.top + innerH - t * innerH}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {areaPath && <path d={areaPath} fill="url(#viewsFill)" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#viewsLine)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Active marker */}
        {active != null && points[active] && (
          <>
            <line
              x1={points[active][0]}
              x2={points[active][0]}
              y1={PAD.top}
              y2={PAD.top + innerH}
              className="stroke-brand-400/60"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={points[active][0]}
              cy={points[active][1]}
              r="4"
              className="fill-white stroke-brand-600 dark:fill-slate-900"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}

        {/* X-axis labels */}
        {buckets.map((b, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text
              key={b.key}
              x={x(i)}
              y={H - 6}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="fill-slate-400 dark:fill-slate-500"
              style={{ fontSize: '9px' }}
            >
              {b.label}
            </text>
          ) : null
        )}
      </svg>

      {/* Tooltip */}
      {active != null && buckets[active] && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1 text-center text-xs font-medium text-white shadow-lg dark:bg-slate-700">
          <span className="font-bold tabular-nums">{buckets[active].count}</span> view{buckets[active].count === 1 ? '' : 's'}
          <span className="ml-1.5 text-slate-300">{buckets[active].label}</span>
        </div>
      )}
    </div>
  )
}
