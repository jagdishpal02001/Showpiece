import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, PRODUCT_IMAGES_BUCKET } from '../lib/supabase'
import { formatPrice, discountInfo } from '../lib/format'
import { useSeo } from '../lib/seo'
import { publicUrlFor } from '../components/QRCard'
import QRCard from '../components/QRCard'
import Analytics from '../components/Analytics'
import Spinner from '../components/Spinner'
import Brand from '../components/Brand'
import ThemeToggle from '../components/ThemeToggle'

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

  useSeo({ title: 'Dashboard' })

  const load = useCallback(async () => {
    setError('')
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*, product_images(*), feedback(count), product_views(count)')
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
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Brand size="md" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setQrFor('store')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <svg className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm8 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm10 1a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" clipRule="evenodd"/></svg>
              <span className="hidden sm:inline">Catalog QR</span>
              <span className="sm:hidden">QR</span>
            </button>
            <Link
              to="/product/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/></svg>
              <span className="hidden sm:inline">New Product</span>
              <span className="sm:hidden">New</span>
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/40">
            <p className="font-medium text-rose-700 dark:text-rose-300">Couldn’t load products.</p>
            <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{error}</p>
            <button
              onClick={() => { setLoading(true); load() }}
              className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center dark:border-slate-800 dark:bg-slate-900 animate-fade-up">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-950/50 dark:text-brand-400 animate-float">
              <svg className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm8 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm10 1a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z"/></svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">No products yet</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create your first product to generate a shareable page and QR code.</p>
            <Link
              to="/product/new"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 active:scale-95"
            >
              Create a product
            </Link>
          </div>
        ) : (
          <>
          <Analytics products={products} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, i) => {
              const cover = coverImage(product)
              const feedbackCount = product.feedback?.[0]?.count ?? 0
              const viewCount = product.product_views?.[0]?.count ?? 0
              const pricing = discountInfo(product.price, product.discount_percent)
              return (
                <div
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-2xl surface transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/40 dark:hover:shadow-black/40 animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {cover ? (
                      <img src={cover} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
                    )}
                    <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
                      {(product.product_images || []).length} photo{(product.product_images || []).length === 1 ? '' : 's'}
                    </span>
                    {pricing.hasDiscount && (
                      <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-2 py-0.5 text-xs font-bold text-white shadow">
                        {pricing.percent}% OFF
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-semibold text-slate-900 dark:text-slate-100">{product.title}</h3>
                      <span className="flex flex-none flex-col items-end">
                        <span className="whitespace-nowrap font-bold text-slate-900 dark:text-white">{formatPrice(pricing.final)}</span>
                        {pricing.hasDiscount && (
                          <span className="text-xs text-slate-400 line-through dark:text-slate-500">{formatPrice(pricing.original)}</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1" title={`${viewCount} view${viewCount === 1 ? '' : 's'}`}>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 4c-4.2 0-7.6 3.4-8.7 5.6a1 1 0 000 .8C2.4 12.6 5.8 16 10 16s7.6-3.4 8.7-5.6a1 1 0 000-.8C17.6 7.4 14.2 4 10 4zm0 9a3 3 0 110-6 3 3 0 010 6z"/></svg>
                        <span className="tabular-nums font-medium">{viewCount.toLocaleString()}</span>
                      </span>
                      <span className="inline-flex items-center gap-1" title={`${feedbackCount} feedback message${feedbackCount === 1 ? '' : 's'}`}>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.3-3.6 6-8 6a9 9 0 01-2.6-.4c-.5.3-1.5.9-3 1.3-.3 0-.6-.2-.4-.6.3-.6.6-1.3.7-2C2.6 13.2 2 11.7 2 10c0-3.3 3.6-6 8-6s8 2.7 8 6z" clipRule="evenodd"/></svg>
                        <span className="tabular-nums font-medium">{feedbackCount.toLocaleString()}</span>
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <a
                        href={publicUrlFor(product.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
                      >
                        View
                      </a>
                      <Link
                        to={`/product/${product.id}/edit`}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setQrFor(product)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
                      >
                        QR
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        disabled={deletingId === product.id}
                        className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                      >
                        {deletingId === product.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </main>

      {/* QR modal */}
      {qrFor && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setQrFor(null)}
          role="dialog"
          aria-modal="true"
          aria-label={qrFor === 'store' ? 'QR code for Store Catalog' : `QR code for ${qrFor.title}`}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {qrFor === 'store' ? 'All Products Catalog' : qrFor.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Scan to open the public page</p>
              </div>
              <button
                onClick={() => setQrFor(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
              </button>
            </div>
            <QRCard
              productId={qrFor === 'store' ? 'store' : qrFor.id}
              title={qrFor === 'store' ? 'all-products-catalog' : qrFor.title}
              size={220}
            />
          </div>
        </div>
      )}
    </div>
  )
}
