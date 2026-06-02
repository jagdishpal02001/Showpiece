import { useCallback, useEffect, useRef, useState } from 'react'

// Responsive product gallery: a large swipeable main image (scroll-snap, works
// with touch on mobile and arrow buttons on desktop) plus a thumbnail strip.
// Images are lazy-loaded.
export default function Gallery({ images = [], title = '' }) {
  const trackRef = useRef(null)
  const [active, setActive] = useState(0)

  const count = images.length

  const scrollTo = useCallback((index) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(index, count - 1))
    const child = track.children[clamped]
    if (child) {
      track.scrollTo({ left: child.offsetLeft, behavior: 'smooth' })
    }
  }, [count])

  // Keep `active` in sync as the user swipes/scrolls the track.
  function onScroll() {
    const track = trackRef.current
    if (!track) return
    const index = Math.round(track.scrollLeft / track.clientWidth)
    if (index !== active) setActive(index)
  }

  // Keyboard navigation on the main viewport.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') scrollTo(active - 1)
      if (e.key === 'ArrowRight') scrollTo(active + 1)
    }
    const track = trackRef.current
    track?.addEventListener('keydown', onKey)
    return () => track?.removeEventListener('keydown', onKey)
  }, [active, scrollTo])

  if (count === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <span className="text-sm">No image</span>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Main viewport */}
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          tabIndex={0}
          className="no-scrollbar snap-x-mandatory flex aspect-square w-full overflow-x-auto rounded-2xl bg-slate-100 focus:outline-none"
          aria-roledescription="carousel"
        >
          {images.map((img, i) => (
            <div
              key={img.id || i}
              className="snap-center relative flex h-full w-full flex-none items-center justify-center"
            >
              <img
                src={img.image_url}
                alt={`${title} — image ${i + 1} of ${count}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Prev / next (hidden when only one image) */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => scrollTo(active - 1)}
              disabled={active === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-md backdrop-blur transition hover:bg-white disabled:opacity-0"
              aria-label="Previous image"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.24a.75.75 0 010-1.06l4.25-4.24a.75.75 0 011.06 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollTo(active + 1)}
              disabled={active === count - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-md backdrop-blur transition hover:bg-white disabled:opacity-0"
              aria-label="Next image"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.24a.75.75 0 010 1.06l-4.25 4.24a.75.75 0 01-1.06 0z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Dots */}
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((img, i) => (
                <span
                  key={img.id || i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === active ? 'w-5 bg-slate-900' : 'w-1.5 bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {count > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id || i}
              type="button"
              onClick={() => scrollTo(i)}
              className={`relative h-16 w-16 flex-none overflow-hidden rounded-lg border-2 transition ${
                i === active ? 'border-slate-900' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === active}
            >
              <img
                src={img.image_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
