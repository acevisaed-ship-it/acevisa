'use client'

import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PWAInstallButton } from '@/components/PWAInstallButton'
import { SectionOrangePlaneToLogo } from '@/components/landing/HeroAnimations'

type View = 'login' | 'forgot'

export default function StudentLoginPage() {
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

    const res = await fetch('/api/student/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Login failed')
      return
    }

    const supabase = createClient()
    await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    })

    window.location.href = `/student/chat?clientId=${data.clientId}`
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
      setFpError(data.error || 'Something went wrong')
    } else {
      setFpMessage(data.message)
    }
  }

  const inputCls = 'glass-input min-h-[52px] w-full rounded-xl px-4 py-3 text-sm outline-none'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8" style={{ background: 'var(--grad-blue)' }}>
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <SectionOrangePlaneToLogo />
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-[24px] glass-card-blue p-6 sm:p-8">
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/80 px-3 py-2 backdrop-blur-md crisp">
            <img src="/logo.png" alt="ACE Altius Consulting" className="h-12 w-auto" />
          </div>
        </div>

        <h1 className="text-center text-2xl font-semibold text-white">Student Portal</h1>
        <p className="mt-1 text-center text-sm text-white/60">Sign in to track your application</p>
        <div className="mt-3 flex justify-center">
          <PWAInstallButton className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/50 hover:text-white transition-all" />
        </div>

        {view === 'login' ? (
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
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="yourname@email.com or 03XX XXXXXXX"
                className={inputCls}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute bottom-3.5 right-4 text-white/40 hover:text-white"
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
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>

            <button
              type="button"
              onClick={() => { setView('forgot'); setError(null) }}
              className="w-full text-center text-sm text-white/50 hover:text-white"
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
            <p className="text-sm text-white/60">
              Enter your email address or phone number. If a profile exists, we will send a password reset link.
            </p>

            <div>
              <label htmlFor="fp-identifier" className="mb-1.5 block text-xs font-medium text-white/60">
                Email or phone number
              </label>
              <input
                id="fp-identifier"
                type="text"
                required
                value={fpIdentifier}
                onChange={(e) => setFpIdentifier(e.target.value)}
                placeholder="yourname@email.com or 03XX XXXXXXX"
                className={inputCls}
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
              Back to login
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-white/30">
          New student?{' '}
          <a href="/" className="text-white/60 hover:text-white hover:underline">Register on our website</a>
        </p>
      </div>
    </div>
  )
}
