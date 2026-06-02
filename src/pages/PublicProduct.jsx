import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatPrice, timeAgo } from '../lib/format'
import Gallery from '../components/Gallery'
import StarRating from '../components/StarRating'
import Spinner from '../components/Spinner'

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
    await loadFeedback()
    setLoading(false)
  }, [id, loadFeedback])

  useEffect(() => {
    load()
  }, [load])

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
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <Spinner label="Loading…" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-4 text-center">
        <h1 className="text-lg font-bold text-slate-800">Something went wrong</h1>
        <p className="mt-1 text-sm text-slate-500">{loadError}</p>
        <button
          onClick={load}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Try again
        </button>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.5 14.5L15 9m-5.5-.5h.01M14.5 14.5h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Product not found</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          This product may have been removed, or the link is incorrect.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          {/* Gallery */}
          <div className="md:sticky md:top-6 md:self-start">
            <Gallery images={images} title={product.title} />
          </div>

          {/* Details */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {product.title}
            </h1>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatPrice(product.price)}
            </p>

            {product.description && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Description</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">
                  {product.description}
                </p>
              </div>
            )}

            {product.extra_notes && (
              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Notes</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">
                  {product.extra_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feedback */}
        <section className="mt-12 border-t border-slate-200 pt-10">
          <h2 className="text-xl font-bold text-slate-900">Feedback</h2>

          {/* Form */}
          {submitted ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 animate-fade-in">
              <svg className="mt-0.5 h-5 w-5 flex-none text-emerald-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.29 6.8-6.79a1 1 0 011.4 0z" clipRule="evenodd"/></svg>
              <div>
                <p className="font-semibold text-emerald-800">Thanks for your feedback!</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-1 text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                >
                  Leave another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitFeedback} className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fb-name" className="mb-1 block text-sm font-medium text-slate-700">
                    Name <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="fb-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Rating <span className="font-normal text-slate-400">(optional)</span>
                  </span>
                  <div className="py-1.5">
                    <StarRating value={rating} onChange={setRating} />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="fb-message" className="mb-1 block text-sm font-medium text-slate-700">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="fb-message"
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What do you think?"
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Submit feedback'}
              </button>
            </form>
          )}

          {/* List */}
          <div className="mt-8">
            {feedback.length === 0 ? (
              <p className="text-sm text-slate-500">No feedback yet — be the first to leave one.</p>
            ) : (
              <ul className="space-y-4">
                {feedback.map((f) => (
                  <li key={f.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {f.visitor_name?.trim() || 'Anonymous'}
                      </span>
                      <span className="text-xs text-slate-400">{timeAgo(f.created_at)}</span>
                    </div>
                    {f.rating ? (
                      <div className="mt-1">
                        <StarRating value={f.rating} readOnly size="sm" />
                      </div>
                    ) : null}
                    <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">{f.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-center">
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600">
            Product showcase
          </Link>
        </footer>
      </div>
    </div>
  )
}
