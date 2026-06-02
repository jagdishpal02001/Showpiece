import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-6xl font-extrabold text-slate-300">404</p>
      <h1 className="mt-3 text-xl font-bold text-slate-800">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Go home
      </Link>
    </div>
  )
}
