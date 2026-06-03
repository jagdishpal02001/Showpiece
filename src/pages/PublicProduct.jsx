import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { recordProductView } from '../lib/analytics'
import { formatPrice, timeAgo, discountInfo } from '../lib/format'
import { useSeo, BRAND } from '../lib/seo'
import Gallery from '../components/Gallery'
import StarRating from '../components/StarRating'
import Spinner from '../components/Spinner'
import Brand from '../components/Brand'
import ThemeToggle from '../components/ThemeToggle'

export default function PublicProduct() {
  const { id } = useParams()

  const [product, setProduct] = useState(null)
  const [images, setImages] = useState([])
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')

  // Feedback form state
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')

  const loadFeedback = useCallback(async () => {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
    setFeedback(data || [])
  }, [id])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setNotFound(false)

    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      setLoadError(error.message)
      setLoading(false)
      return
    }
    if (!data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setProduct(data)
    setImages([...(data.product_images || [])].sort((a, b) => a.sort_order - b.sort_order))
    // Record the visit for the owner's analytics (fire-and-forget, deduped).
    recordProductView(id)
    await loadFeedback()
    setLoading(false)
  }, [id, loadFeedback])

  useEffect(() => {
    load()
  }, [load])

  const pricing = useMemo(
    () => (product ? discountInfo(product.price, product.discount_percent) : null),
    [product]
  )

  // Per-product SEO (title, description, social image).
  useSeo({
    title: product?.title,
    description: product
      ? (product.description?.slice(0, 155) ||
          `${product.title} — ${formatPrice(product.price)}. View photos and leave feedback on ${BRAND}.`)
      : undefined,
    image: images[0]?.image_url,
    type: 'product',
  })

  async function submitFeedback(e) {
    e.preventDefault()
    setFormError('')
    if (!message.trim()) {
      setFormError('Please write a message.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.from('feedback').insert({
      product_id: id,
      visitor_name: name.trim() || null,
      message: message.trim(),
      rating: rating || null,
    })
    setSubmitting(false)

    if (error) {
      setFormError(error.message || 'Could not submit feedback. Please try again.')
      return
    }

    setSubmitted(true)
    setName('')
    setMessage('')
    setRating(0)
    await loadFeedback()
  }

  // --- Render states ---
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner label="Loading…" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Something went wrong</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{loadError}</p>
        <button
          onClick={load}
          className="mt-5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500"
        >
          Try again
        </button>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.5 14.5L15 9m-5.5-.5h.01M14.5 14.5h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Product not found</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          This product may have been removed, or the link is incorrect.
        </p>
        <Brand size="sm" className="mt-8 opacity-70" />
      </div>
    )
  }

  const year = new Date().getFullYear()
  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      {/* Brand header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/products" className="focus-visible:ring-offset-2">
            <Brand size="md" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          {/* Gallery */}
          <div className="md:sticky md:top-20 md:self-start animate-fade-up">
            <Gallery images={images} title={product.title} />
          </div>

          {/* Details */}
          <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
            <Link
              to="/products"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition mb-4 group"
            >
              <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All Products Catalog
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              {product.title}
            </h1>

            {/* Price + optional discount */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {pricing?.hasDiscount ? (
                <>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {formatPrice(pricing.final)}
                  </span>
                  <span className="text-xl font-medium text-slate-400 line-through dark:text-slate-500">
                    {formatPrice(pricing.original)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm animate-scale-in">
                    {pricing.percent}% OFF
                  </span>
                </>
              ) : (
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
            {pricing?.hasDiscount && (
              <p className="mt-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                You save {formatPrice(pricing.original - pricing.final)}
              </p>
            )}

            {product.description && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
                  {product.description}
                </p>
              </div>
            )}

            {product.extra_notes && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Notes</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
                  {product.extra_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feedback */}
        <section className="mt-12 border-t border-slate-200 pt-10 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Feedback</h2>

          {/* Form */}
          {submitted ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40 animate-scale-in">
              <svg className="mt-0.5 h-5 w-5 flex-none text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.29 6.8-6.79a1 1 0 011.4 0z" clipRule="evenodd"/></svg>
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">Thanks for your feedback!</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-1 text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
                >
                  Leave another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitFeedback} className="mt-4 space-y-4 rounded-2xl surface p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fb-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Name <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="fb-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Rating <span className="font-normal text-slate-400">(optional)</span>
                  </span>
                  <div className="py-1.5">
                    <StarRating value={rating} onChange={setRating} />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="fb-message" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="fb-message"
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What do you think?"
                  className={`${inputClass} resize-y`}
                />
              </div>

              {formError && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 animate-slide-down" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 active:scale-95 disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Submit feedback'}
              </button>
            </form>
          )}

          {/* List */}
          <div className="mt-8">
            {feedback.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No feedback yet — be the first to leave one.</p>
            ) : (
              <ul className="space-y-4">
                {feedback.map((f, i) => (
                  <li
                    key={f.id}
                    className="rounded-2xl surface p-4 animate-fade-up"
                    style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {f.visitor_name?.trim() || 'Anonymous'}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(f.created_at)}</span>
                    </div>
                    {f.rating ? (
                      <div className="mt-1">
                        <StarRating value={f.rating} readOnly size="sm" />
                      </div>
                    ) : null}
                    <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">{f.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Footer with brand + copyright */}
        <footer className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
          <div className="flex flex-col items-center gap-3 text-center">
            <Brand size="sm" />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {BRAND} — {''}beautiful product pages & QR codes.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              © {year} {BRAND}. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
