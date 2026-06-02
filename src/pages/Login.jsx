import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useSeo, BRAND } from '../lib/seo'
import Brand from '../components/Brand'

export default function Login() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useSeo({ title: 'Owner sign in' })

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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Decorative animated brand glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl animate-float" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-fuchsia-600/20 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="mb-6 flex flex-col items-center text-center">
          <Brand size="lg" showName={false} className="animate-float" />
          <h1 className="mt-4 text-2xl font-bold text-white">
            Welcome to <span className="text-gradient-brand">{BRAND}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to manage your products and QR codes</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur dark:bg-slate-900/90"
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 animate-slide-down"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          This is a private {BRAND} dashboard. Access is by invitation only.
        </p>
        <p className="mt-2 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} {BRAND}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
