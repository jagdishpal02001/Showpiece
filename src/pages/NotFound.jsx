import { Link } from 'react-router-dom'
import { useSeo } from '../lib/seo'
import Brand from '../components/Brand'

export default function NotFound() {
  useSeo({ title: 'Page not found' })

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
      <p className="bg-gradient-to-br from-brand-500 to-fuchsia-500 bg-clip-text text-7xl font-black text-transparent animate-scale-in">
        404
      </p>
      <h1 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-100">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 active:scale-95"
      >
        Go home
      </Link>
      <Brand size="sm" className="mt-10 opacity-70" />
    </div>
  )
}
