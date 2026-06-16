'use client'

import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

type View = 'login' | 'forgot'

const inputClass =
  'min-h-[52px] w-full rounded-card border border-text/20 bg-bg px-4 py-3.5 text-base text-text placeholder:text-text/40 outline-none transition-colors duration-700 focus:border-blue'

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
    <main className="bg-texture flex min-h-screen items-center justify-center bg-bg px-5 py-24">
      <div className="w-full rounded-[20px] bg-grad-bg crisp p-6 sm:max-w-[400px] sm:p-8">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-16 w-auto" />
        </div>

        {view === 'login' ? (
          <>
            <h1 className="text-center text-2xl font-semibold text-blue">Welcome back</h1>
            <p className="mt-2 text-center text-sm text-text/60">
              Sign in to continue your session.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-text/70">
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
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text/70">
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
                  className="absolute bottom-3.5 right-4 text-text/40 hover:text-text"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="min-h-[52px] w-full py-4 text-base font-bold"
              >
                {loading ? 'Signing in…' : 'Continue →'}
              </Button>

              <button
                type="button"
                onClick={() => { setView('forgot'); setError(null) }}
                className="w-full text-center text-sm text-blue hover:underline"
              >
                Forgot password?
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-text/40">
              New student?{' '}
              <a href="/" className="text-blue hover:underline">Register on our website</a>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-center text-2xl font-semibold text-blue">Reset password</h1>
            <p className="mt-2 text-center text-sm text-text/60">
              Enter your email or phone — we&apos;ll send a reset link.
            </p>

            <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
              <div>
                <label htmlFor="fp-identifier" className="mb-1.5 block text-sm font-medium text-text/70">
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
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{fpError}</p>
              )}
              {fpMessage && (
                <p className="rounded-xl bg-green/20 px-4 py-2.5 text-sm text-text">✓ {fpMessage}</p>
              )}

              <Button
                type="submit"
                disabled={fpLoading}
                className="min-h-[52px] w-full py-4 text-base font-bold"
              >
                {fpLoading ? 'Sending…' : 'Send reset link'}
              </Button>

              <button
                type="button"
                onClick={() => { setView('login'); setFpMessage(null); setFpError(null) }}
                className="w-full text-center text-sm text-blue hover:underline"
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
