'use client'

import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type View = 'login' | 'forgot'

const inputClass = 'glass-input min-h-[52px] w-full rounded-xl px-4 py-3 text-sm outline-none'

export default function ReturnPage() {
  const [view, setView] = useState<View>('login')

  // Login state
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Forgot password state
  const [fpIdentifier, setFpIdentifier] = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpMessage, setFpMessage] = useState<string | null>(null)
  const [fpError, setFpError] = useState<string | null>(null)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Login failed. Please check your details and try again.')
      return
    }

    // Set Supabase session in browser
    const supabase = createClient()
    await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    })

    window.location.href = `/chat/${data.clientId}`
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault()
    setFpError(null)
    setFpMessage(null)
    setFpLoading(true)

    const res = await fetch('/api/student/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: fpIdentifier }),
    })
    const data = await res.json()
    setFpLoading(false)

    if (!res.ok) {
      setFpError(data.error || 'Something went wrong. Please try again.')
    } else {
      setFpMessage(data.message)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-grad-teal px-4 py-8">
      <img
        src="/paper plane Orange 2.svg"
        alt=""
        aria-hidden
        className="landing-decor-plane pointer-events-none absolute right-[8%] top-[12%] -rotate-6 opacity-90 sm:right-[12%] sm:top-[10%]"
      />

      <div className="relative w-full max-w-sm rounded-[24px] glass-card-blue p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/80 px-3 py-2 backdrop-blur-md crisp">
            <img src="/logo.png" alt="ACE Altius Consulting" className="h-14 w-auto" />
          </div>
        </div>

        {view === 'login' ? (
          <>
            <h1 className="text-center text-2xl font-semibold text-white">Welcome back</h1>
            <p className="mt-2 text-center text-sm text-white/60">
              Sign in to continue your session.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <label htmlFor="identifier" className="mb-1.5 block text-xs font-medium text-white/60">
                  Email address or phone number
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="yourname@email.com or 03XX XXXXXXX"
                  className={inputClass}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>

              <div className="relative">
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-white/60">
                  Password
                </label>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Your password"
                  className={`${inputClass} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute bottom-3.5 right-4 text-white/40 hover:text-white"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-300">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="min-h-[52px] w-full rounded-full bg-grad-green crisp-on-dark py-3 text-sm font-bold text-text transition-all hover:brightness-110 disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Continue →'}
              </button>

              <button
                type="button"
                onClick={() => { setView('forgot'); setError(null) }}
                className="w-full text-center text-sm text-white/50 hover:text-white"
              >
                Forgot password?
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-white/30">
              New student?{' '}
              <a href="/" className="text-white/60 hover:text-white hover:underline">Register on our website</a>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-center text-2xl font-semibold text-white">Reset password</h1>
            <p className="mt-2 text-center text-sm text-white/60">
              Enter your email or phone — we&apos;ll send a reset link.
            </p>

            <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
              <div>
                <label htmlFor="fp-identifier" className="mb-1.5 block text-xs font-medium text-white/60">
                  Email or phone number
                </label>
                <input
                  id="fp-identifier"
                  type="text"
                  required
                  placeholder="yourname@email.com or 03XX XXXXXXX"
                  className={inputClass}
                  value={fpIdentifier}
                  onChange={(e) => setFpIdentifier(e.target.value)}
                />
              </div>

              {fpError && (
                <p className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-300">{fpError}</p>
              )}
              {fpMessage && (
                <p className="rounded-xl bg-green/20 px-4 py-2.5 text-sm text-white">✓ {fpMessage}</p>
              )}

              <button
                type="submit"
                disabled={fpLoading}
                className="min-h-[52px] w-full rounded-full bg-grad-green crisp-on-dark py-3 text-sm font-bold text-text transition-all hover:brightness-110 disabled:opacity-60"
              >
                {fpLoading ? 'Sending…' : 'Send reset link'}
              </button>

              <button
                type="button"
                onClick={() => { setView('login'); setFpMessage(null); setFpError(null) }}
                className="w-full text-center text-sm text-white/50 hover:text-white"
              >
                Back to sign in
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
