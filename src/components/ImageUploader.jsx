import { useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase, PRODUCT_IMAGES_BUCKET } from '../lib/supabase'

// Compression target per the spec: ~0.4 MB max, max dimension ~1600px.
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
}

const ACCEPTED = 'image/*'

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Fallback for older browsers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function extFor(file) {
  const fromName = file.name?.split('.').pop()?.toLowerCase()
  if (fromName && fromName.length <= 5) return fromName
  const fromType = file.type?.split('/').pop()
  return fromType || 'jpg'
}

/**
 * Controlled image manager for the product form.
 *
 * `items` is an array the parent owns. Each item is one of:
 *   { kind: 'existing', id, image_url }                      // already saved
 *   { kind: 'new', localId, file, previewUrl, status,        // being added
 *     path, image_url, error }
 *
 * status for a new item: 'compressing' | 'uploading' | 'done' | 'error'
 *
 * Files are compressed and uploaded to Storage immediately (with per-file
 * status), but the product_images DB rows are written by the parent on save,
 * because that's when the product row + final sort_order exist.
 */
export default function ImageUploader({ productId, items, setItems, disabled = false }) {
  const inputRef = useRef(null)

  function updateItem(localId, patch) {
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it))
    )
  }

  async function processFile(file) {
    const localId = uuid()
    const previewUrl = URL.createObjectURL(file)

    // Add immediately so the user sees a tile with a spinner.
    setItems((prev) => [
      ...prev,
      { kind: 'new', localId, file, previewUrl, status: 'compressing' },
    ])

    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS)
      updateItem(localId, { status: 'uploading' })

      const path = `${productId}/${uuid()}.${extFor(file)}`
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(path, compressed, {
          cacheControl: '3600',
          upsert: false,
          contentType: compressed.type || file.type || 'image/jpeg',
        })

      if (uploadError) throw uploadError

      // Only read the public URL AFTER the upload has finished.
      const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
      updateItem(localId, { status: 'done', path, image_url: data.publicUrl })
    } catch (err) {
      console.error('Image upload failed:', err)
      updateItem(localId, { status: 'error', error: err.message || 'Upload failed' })
    }
  }

  function onSelect(e) {
    const files = Array.from(e.target.files || [])
    // Reset the input so selecting the same file again still fires onChange.
    e.target.value = ''
    // Upload in parallel; each file handles its own success/failure.
    files.forEach((file) => {
      if (file.type.startsWith('image/')) processFile(file)
    })
  }

  async function retry(item) {
    // Remove the failed tile and re-process its original file.
    setItems((prev) => prev.filter((it) => it.localId !== item.localId))
    if (item.file) processFile(item.file)
  }

  function removeItem(item) {
    setItems((prev) =>
      prev.filter((it) =>
        item.kind === 'existing' ? it.id !== item.id : it.localId !== item.localId
      )
    )
    if (item.kind === 'new') {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      // A new image that was already uploaded has a storage object but no DB
      // row yet — delete it now so removing it before save doesn't orphan a file.
      if (item.path) {
        supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .remove([item.path])
          .then(({ error }) => {
            if (error) console.error('Could not clean up removed upload:', error)
          })
      }
    }
    // Existing (already-saved) images are reconciled by the parent on save, so a
    // remove-before-save stays recoverable until the user actually saves.
  }

  function move(index, dir) {
    setItems((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function srcFor(item) {
    if (item.kind === 'existing') return item.image_url
    return item.image_url || item.previewUrl
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
          </svg>
          Add images
        </button>
        <span className="text-xs text-slate-500">
          {items.length} image{items.length === 1 ? '' : 's'} · drag order with the arrows
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={onSelect}
      />

      {items.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item, index) => {
            const busy = item.kind === 'new' && (item.status === 'compressing' || item.status === 'uploading')
            const failed = item.kind === 'new' && item.status === 'error'
            const key = item.kind === 'existing' ? item.id : item.localId
            return (
              <li
                key={key}
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <img
                  src={srcFor(item)}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />

                {/* First image = cover badge */}
                {index === 0 && !busy && !failed && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Cover
                  </span>
                )}

                {/* Busy overlay */}
                {busy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/70 text-xs font-medium text-slate-600">
                    <svg className="h-5 w-5 animate-spin text-slate-500" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    {item.status === 'compressing' ? 'Compressing…' : 'Uploading…'}
                  </div>
                )}

                {/* Error overlay */}
                {failed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-50/90 p-2 text-center text-[11px] text-red-700">
                    <span className="font-semibold">Upload failed</span>
                    <button
                      type="button"
                      onClick={() => retry(item)}
                      className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-700"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Controls */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="rounded bg-white/90 p-1 text-slate-700 shadow disabled:opacity-30"
                      aria-label="Move left"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.24a.75.75 0 010-1.06l4.25-4.24a.75.75 0 011.06 0z" clipRule="evenodd"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      className="rounded bg-white/90 p-1 text-slate-700 shadow disabled:opacity-30"
                      aria-label="Move right"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.24a.75.75 0 010 1.06l-4.25 4.24a.75.75 0 01-1.06 0z" clipRule="evenodd"/></svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="rounded bg-white/90 p-1 text-red-600 shadow hover:bg-white"
                    aria-label="Remove image"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v9a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v5a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v5a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
