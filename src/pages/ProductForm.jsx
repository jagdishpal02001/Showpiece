import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, PRODUCT_IMAGES_BUCKET } from '../lib/supabase'
import { discountInfo, formatPrice } from '../lib/format'
import { useSeo } from '../lib/seo'
import ImageUploader from '../components/ImageUploader'
import QRCard from '../components/QRCard'
import Spinner from '../components/Spinner'
import Brand from '../components/Brand'
import ThemeToggle from '../components/ThemeToggle'

function newUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function storagePathFromUrl(url) {
  const marker = `/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length))
}

export default function ProductForm() {
  const { id: routeId } = useParams()
  const isEdit = Boolean(routeId)
  const navigate = useNavigate()

  // For a new product we mint the id up front so image storage paths and the QR
  // can use it immediately. Keep it stable across renders.
  const generatedId = useRef(newUuid())
  const productId = isEdit ? routeId : generatedId.current

  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [discountPercent, setDiscountPercent] = useState('')
  const [description, setDescription] = useState('')
  const [extraNotes, setExtraNotes] = useState('')
  const [items, setItems] = useState([])
  const originalImageIds = useRef(new Set()) // ids present when the form loaded

  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load existing product when editing.
  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', routeId)
      .maybeSingle()

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }
    if (!data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setTitle(data.title ?? '')
    setPrice(data.price ?? '')
    setDiscountPercent(data.discount_percent ? String(data.discount_percent) : '')
    setDescription(data.description ?? '')
    setExtraNotes(data.extra_notes ?? '')

    const imgs = [...(data.product_images || [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ kind: 'existing', id: img.id, image_url: img.image_url }))
    originalImageIds.current = new Set(imgs.map((i) => i.id))
    setItems(imgs)
    setLoading(false)
  }, [routeId])

  useEffect(() => {
    if (isEdit) load()
  }, [isEdit, load])

  const uploading = useMemo(
    () => items.some((it) => it.kind === 'new' && (it.status === 'compressing' || it.status === 'uploading')),
    [items]
  )
  const hasFailed = useMemo(
    () => items.some((it) => it.kind === 'new' && it.status === 'error'),
    [items]
  )

  useSeo({ title: isEdit ? `Edit ${title || 'product'}` : 'New product' })

  // Live preview of how the discount will render on the public page.
  const pricePreview = useMemo(
    () => discountInfo(price, discountPercent),
    [price, discountPercent]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    const priceNum = Number(price)
    if (price === '' || !Number.isFinite(priceNum) || priceNum < 0) {
      setError('Enter a valid price (0 or more).')
      return
    }
    const discountNum = discountPercent === '' ? 0 : Number(discountPercent)
    if (!Number.isFinite(discountNum) || discountNum < 0 || discountNum > 100) {
      setError('Discount must be between 0 and 100.')
      return
    }
    if (uploading) {
      setError('Please wait for images to finish uploading.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        id: productId,
        title: title.trim(),
        price: priceNum,
        discount_percent: discountNum,
        description: description.trim() || null,
        extra_notes: extraNotes.trim() || null,
      }

      // Create or update the product row.
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(payload, { onConflict: 'id' })
      if (upsertError) throw upsertError

      // --- Reconcile images ---
      const remainingExistingIds = new Set(
        items.filter((it) => it.kind === 'existing').map((it) => it.id)
      )

      // 1. Delete existing images the user removed (DB rows + storage objects).
      const removed = [...originalImageIds.current].filter((idv) => !remainingExistingIds.has(idv))
      if (removed.length) {
        // Need their urls to derive storage paths.
        const { data: removedRows } = await supabase
          .from('product_images')
          .select('id, image_url')
          .in('id', removed)
        const paths = (removedRows || [])
          .map((r) => storagePathFromUrl(r.image_url))
          .filter(Boolean)
        if (paths.length) {
          await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths)
        }
        await supabase.from('product_images').delete().in('id', removed)
      }

      // 2. Persist order + new images. Update existing rows' sort_order, insert
      //    newly-uploaded ones. (Failed uploads are skipped.)
      const ops = []
      const inserts = []
      items.forEach((it, index) => {
        if (it.kind === 'existing') {
          ops.push(
            supabase.from('product_images').update({ sort_order: index }).eq('id', it.id)
          )
        } else if (it.status === 'done' && it.image_url) {
          inserts.push({ product_id: productId, image_url: it.image_url, sort_order: index })
        }
      })
      if (inserts.length) ops.push(supabase.from('product_images').insert(inserts))

      const results = await Promise.all(ops)
      const firstErr = results.find((r) => r && r.error)
      if (firstErr) throw firstErr.error

      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not save the product.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner label="Loading product…" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Product not found</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">It may have been deleted.</p>
        <Link to="/dashboard" className="mt-5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'
  const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300'
  const cardClass = 'space-y-4 rounded-2xl surface p-5 animate-fade-up'

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.24a.75.75 0 010-1.06l4.25-4.24a.75.75 0 011.06 0z" clipRule="evenodd"/></svg>
            Dashboard
          </Link>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">{isEdit ? 'Edit product' : 'New product'}</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={cardClass}>
            <div>
              <label htmlFor="title" className={labelClass}>
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Classic Aviator Sunglasses"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="price" className={labelClass}>
                  Price <span className="text-rose-500">*</span>
                </label>
                <input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">The final price the customer pays.</p>
              </div>

              <div>
                <label htmlFor="discount" className={labelClass}>
                  Discount % <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    id="discount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="0"
                    className={`${inputClass} pr-8`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Shows a struck-through higher price.</p>
              </div>
            </div>

            {/* Live discount preview */}
            {pricePreview.hasDiscount && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-950/40 animate-scale-in">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-500 dark:text-brand-300">Preview</span>
                <span className="text-sm text-slate-400 line-through dark:text-slate-500">{formatPrice(pricePreview.original)}</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{formatPrice(pricePreview.final)}</span>
                <span className="rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                  {pricePreview.percent}% OFF
                </span>
              </div>
            )}

            <div>
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product, materials, sizing…"
                className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="notes" className={labelClass}>
                Extra notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="Care instructions, availability, anything else…"
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl surface p-5 animate-fade-up" style={{ animationDelay: '60ms' }}>
            <h2 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Images</h2>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              The first image is used as the cover. Reorder with the arrows on each tile.
            </p>
            <ImageUploader
              productId={productId}
              items={items}
              setItems={setItems}
              disabled={saving}
            />
          </div>

          {/* QR preview (handy while editing) */}
          <div className="rounded-2xl surface p-5 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <h2 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Public page QR</h2>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Points at <span className="font-mono text-brand-600 dark:text-brand-400">{`/p/${productId}`}</span>. Works once you save.
            </p>
            <QRCard productId={productId} title={title || 'product'} size={140} compact />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 animate-slide-down" role="alert">
              {error}
            </p>
          )}
          {hasFailed && !error && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              Some images failed to upload. Retry or remove them before saving.
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:shadow-brand-600/40 hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              {saving ? 'Saving…' : uploading ? 'Uploading images…' : isEdit ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
