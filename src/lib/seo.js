import { useEffect } from 'react'

export const BRAND = 'Nefits'
export const BRAND_TAGLINE = 'Beautiful product pages & QR codes'

function upsertMeta(attr, key, content) {
  if (content == null || content === '') return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href) {
  if (!href) return
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// Lightweight, dependency-free document-head manager for per-page SEO.
// Sets <title>, description, canonical, plus Open Graph + Twitter card tags.
export function useSeo({ title, description, image, url, type = 'website' } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${BRAND}` : `${BRAND} — ${BRAND_TAGLINE}`
    const canonical = url || (typeof window !== 'undefined' ? window.location.href : '')
    document.title = fullTitle

    upsertMeta('name', 'description', description)
    upsertCanonical(canonical)

    upsertMeta('property', 'og:site_name', BRAND)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:image', image)

    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)
  }, [title, description, image, url, type])
}
