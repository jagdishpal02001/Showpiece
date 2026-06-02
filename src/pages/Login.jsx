import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // If already logged in, skip the form.
  useEffect(() => {
    if (!loading && session) navigate('/dashboard', { replace: true })
  }, [loading, session, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setSubmitting(false)

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : signInError.message
      )
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm8 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm10 1a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Owner sign in</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your products and QR codes</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-xl"
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-slate-900 focus:border-slate-900 focus:ring-1"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-slate-900 focus:border-slate-900 focus:ring-1"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          This is a private dashboard. Access is by invitation only.
        </p>
      </div>
    </div>
  )
}
