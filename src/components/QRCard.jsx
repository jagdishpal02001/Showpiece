import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

// Builds the absolute public URL for a product from the current origin, so the
// QR works in dev and prod without any hard-coded domain.
export function publicUrlFor(id) {
  return `${window.location.origin}/p/${id}`
}

const QR_OPTIONS = {
  margin: 2,
  width: 512,
  errorCorrectionLevel: 'M',
  color: { dark: '#0f172a', light: '#ffffff' },
}

// Renders a QR code for a product's public page with Download PNG / SVG and a
// Share (Web Share API) / Copy-link action. `size` is the on-screen px size.
export default function QRCard({ productId, title = 'product', size = 128, compact = false }) {
  const canvasRef = useRef(null)
  const url = publicUrlFor(productId)
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  // Draw the QR to the visible canvas whenever the URL changes.
  useEffect(() => {
    let cancelled = false
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, QR_OPTIONS, (err) => {
        if (err && !cancelled) console.error('QR render failed:', err)
      })
    }
    return () => {
      cancelled = true
    }
  }, [url])

  const safeName = (title || 'product').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'product'

  function triggerDownload(href, filename) {
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function downloadPng() {
    // Generate a high-res PNG independent of the on-screen canvas size.
    const dataUrl = await QRCode.toDataURL(url, QR_OPTIONS)
    triggerDownload(dataUrl, `qr-${safeName}.png`)
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(url, { ...QR_OPTIONS, type: 'svg' })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const objectUrl = URL.createObjectURL(blob)
    triggerDownload(objectUrl, `qr-${safeName}.svg`)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be blocked; fall back to a prompt.
      window.prompt('Copy this link:', url)
    }
  }

  async function share() {
    try {
      await navigator.share({ title, text: `Check out ${title}`, url })
    } catch (err) {
      // AbortError = user cancelled the share sheet; ignore it.
      if (err && err.name !== 'AbortError') copyLink()
    }
  }

  return (
    <div className={compact ? 'flex items-center gap-3' : 'flex flex-col items-center gap-3'}>
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm ring-1 ring-black/5">
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size }}
          className="block rounded"
          aria-label={`QR code linking to the public page for ${title}`}
        />
      </div>

      <div className={compact ? 'flex flex-col gap-1.5' : 'flex flex-wrap items-center justify-center gap-1.5'}>
        <button
          type="button"
          onClick={downloadPng}
          className="rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
        >
          PNG
        </button>
        <button
          type="button"
          onClick={downloadSvg}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          SVG
        </button>
        {canShare ? (
          <button
            type="button"
            onClick={share}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Share
          </button>
        ) : (
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        )}
      </div>
    </div>
  )
}
