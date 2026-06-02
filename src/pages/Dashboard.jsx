import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, PRODUCT_IMAGES_BUCKET } from '../lib/supabase'
import { formatPrice } from '../lib/format'
import { publicUrlFor } from '../components/QRCard'
import QRCard from '../components/QRCard'
import Spinner from '../components/Spinner'

function coverImage(product) {
  const imgs = [...(product.product_images || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )
  return imgs[0]?.image_url || null
}

// Extract the storage object path (everything after the bucket name) from a
// public URL, so we can delete the object on product deletion.
function storagePathFromUrl(url) {
  const marker = `/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length))
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [qrFor, setQrFor] = useState(null) // product currently showing QR modal

  const load = useCallback(async () => {
    setError('')
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*, product_images(*), feedback(count)')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setProducts([])
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(product) {
    const ok = window.confirm(
      `Delete “${product.title}”? This permanently removes the product, its images, and all its feedback.`
    )
    if (!ok) return

    setDeletingId(product.id)
    try {
      // 1. Delete storage objects explicitly (DB cascade won't touch storage).
      const paths = (product.product_images || [])
        .map((img) => storagePathFromUrl(img.image_url))
        .filter(Boolean)
      if (paths.length) {
        const { error: storageError } = await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .remove(paths)
        if (storageError) console.error('Storage cleanup failed:', storageError)
      }

      // 2. Delete the product row; cascade removes image rows + feedback.
      const { error: delError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
      if (delError) throw delError

      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    } catch (err) {
      alert(`Could not delete product: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm8 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm10 1a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z"/></svg>
            </div>
            <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/product/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/></svg>
              New Product
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner label="Loading products…" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-700">Couldn’t load products.</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
            <button
              onClick={() => { setLoading(true); load() }}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <h2 className="text-lg font-semibold text-slate-800">No products yet</h2>
            <p className="mt-1 text-sm text-slate-500">Create your first product to generate a shareable page and QR code.</p>
            <Link
              to="/product/new"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Create a product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const cover = coverImage(product)
              const feedbackCount = product.feedback?.[0]?.count ?? 0
              return (
                <div
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {cover ? (
                      <img src={cover} alt={product.title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
                    )}
                    <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                      {(product.product_images || []).length} photo{(product.product_images || []).length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-semibold text-slate-900">{product.title}</h3>
                      <span className="whitespace-nowrap font-bold text-slate-900">{formatPrice(product.price)}</span>
                    </div>
                    {feedbackCount > 0 && (
                      <p className="mt-1 text-xs text-slate-500">{feedbackCount} feedback message{feedbackCount === 1 ? '' : 's'}</p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <a
                        href={publicUrlFor(product.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        View
                      </a>
                      <Link
                        to={`/product/${product.id}/edit`}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setQrFor(product)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        QR
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        disabled={deletingId === product.id}
                        className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === product.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* QR modal */}
      {qrFor && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQrFor(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`QR code for ${qrFor.title}`}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{qrFor.title}</h3>
                <p className="text-xs text-slate-500">Scan to open the public page</p>
              </div>
              <button
                onClick={() => setQrFor(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
              </button>
            </div>
            <QRCard productId={qrFor.id} title={qrFor.title} size={220} />
          </div>
        </div>
      )}
    </div>
  )
}
