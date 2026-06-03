import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatPrice, discountInfo } from '../lib/format'
import { useSeo, BRAND } from '../lib/seo'
import Spinner from '../components/Spinner'
import Brand from '../components/Brand'
import ThemeToggle from '../components/ThemeToggle'

function coverImage(product) {
  const imgs = [...(product.product_images || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )
  return imgs[0]?.image_url || null
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-[4/3] w-full animate-pulse bg-slate-200 dark:bg-slate-800">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>
      <div className="flex flex-1 flex-col p-5 space-y-3">
        <div className="h-5 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        <div className="mt-4 flex items-center justify-between pt-2">
          <div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-5 w-12 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function PublicProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useSeo({
    title: 'Product Catalog',
    description: `Discover our collection of premium products at ${BRAND}. Select any item to view high-resolution photos, pricing details, and reviews.`,
  })

  async function load() {
    try {
      setLoading(true)
      setError('')
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setProducts(data || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch catalog.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products]

    // Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      )
    }

    // Sort order
    result.sort((a, b) => {
      const pricingA = discountInfo(a.price, a.discount_percent)
      const pricingB = discountInfo(b.price, b.discount_percent)

      if (sortBy === 'price-asc') {
        return pricingA.final - pricingB.final
      }
      if (sortBy === 'price-desc') {
        return pricingB.final - pricingA.final
      }
      if (sortBy === 'discount') {
        return (b.discount_percent || 0) - (a.discount_percent || 0)
      }
      // 'newest'
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return result
  }, [products, searchQuery, sortBy])

  const year = new Date().getFullYear()

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/products" className="focus-visible:ring-offset-2">
            <Brand size="md" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-6 text-center sm:pt-14 sm:pb-8 animate-fade-in">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
          OUR COLLECTION
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl md:text-5xl">
          Welcome to Our Catalog
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 dark:text-slate-400 sm:text-lg">
          Browse through our handpicked collection of items. Scan individual QR codes in-store to view detailed product information, or browse the entire catalog below.
        </p>
      </section>

      {/* Main Catalog Area */}
      <main className="mx-auto max-w-6xl px-4 pb-16">
        {/* Search & Sort Panel */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-down">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label="Clear search"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-by" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sort by:
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="newest">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount">Highest Discount</option>
            </select>
          </div>
        </div>

        {/* Results grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/40 animate-scale-in">
            <p className="font-semibold text-rose-700 dark:text-rose-300">Could not load the catalog.</p>
            <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{error}</p>
            <button
              onClick={load}
              className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900 animate-scale-in">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">No products found</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {searchQuery ? 'Try adjusting your keywords or clearing the search.' : 'There are no products in the catalog yet.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedProducts.map((product, i) => {
              const cover = coverImage(product)
              const pricing = discountInfo(product.price, product.discount_percent)
              return (
                <Link
                  key={product.id}
                  to={`/p/${product.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl surface transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-300/40 dark:hover:shadow-black/50 animate-fade-up focus-visible:ring-offset-2"
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                >
                  {/* Image container */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {cover ? (
                      <img
                        src={cover}
                        alt={product.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-450 dark:text-slate-500">
                        No image available
                      </div>
                    )}

                    {/* Photos count */}
                    <span className="absolute right-2.5 top-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                      {(product.product_images || []).length} photo{(product.product_images || []).length === 1 ? '' : 's'}
                    </span>

                    {/* Discount badge */}
                    {pricing.hasDiscount && (
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                        {pricing.percent}% OFF
                      </span>
                    )}
                  </div>

                  {/* Body container */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-1 font-bold text-slate-900 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400 transition-colors duration-200 text-lg">
                      {product.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400 flex-1">
                      {product.description || 'No description provided.'}
                    </p>

                    {/* Pricing */}
                    <div className="mt-5 flex items-baseline justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                      <span className="text-xs text-slate-400 font-medium">Final Price</span>
                      <div className="flex items-center gap-1.5">
                        {pricing.hasDiscount && (
                          <span className="text-xs text-slate-400 line-through dark:text-slate-500 font-medium">
                            {formatPrice(pricing.original)}
                          </span>
                        )}
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">
                          {formatPrice(pricing.final)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-3 text-center">
          <Brand size="sm" />
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {BRAND} — beautiful product catalogs & interactive pages.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {year} {BRAND}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
