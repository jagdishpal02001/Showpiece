import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, PRODUCT_IMAGES_BUCKET } from '../lib/supabase'
import ImageUploader from '../components/ImageUploader'
import QRCard from '../components/QRCard'
import Spinner from '../components/Spinner'

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
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <Spinner label="Loading product…" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <h1 className="text-xl font-bold text-slate-800">Product not found</h1>
        <p className="mt-1 text-sm text-slate-500">It may have been deleted.</p>
        <Link to="/dashboard" className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.24a.75.75 0 010-1.06l4.25-4.24a.75.75 0 011.06 0z" clipRule="evenodd"/></svg>
            Dashboard
          </Link>
          <h1 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit product' : 'New product'}</h1>
          <span className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Classic Aviator Sunglasses"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="price" className="mb-1 block text-sm font-medium text-slate-700">
                Price <span className="text-red-500">*</span>
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product, materials, sizing…"
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="notes" className="mb-1 block text-sm font-medium text-slate-700">
                Extra notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="Care instructions, availability, anything else…"
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-slate-800">Images</h2>
            <p className="mb-4 text-xs text-slate-500">
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-slate-800">Public page QR</h2>
            <p className="mb-4 text-xs text-slate-500">
              Points at <span className="font-mono">{`/p/${productId}`}</span>. Works once you save.
            </p>
            <QRCard productId={productId} title={title || 'product'} size={140} compact />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          )}
          {hasFailed && !error && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              Some images failed to upload. Retry or remove them before saving.
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Link
              to="/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : uploading ? 'Uploading images…' : isEdit ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
