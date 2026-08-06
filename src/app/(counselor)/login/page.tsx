'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CounselorLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    const { data: counselor } = await supabase
      .from('counselors')
      .select('id, name, status, role')
      .eq('email', email)
      .single()

    if (!counselor) {
      await supabase.auth.signOut()
      setError('Account not set up. Contact admin.')
      setLoading(false)
      return
    }

    if (counselor.status !== 'active') {
      await supabase.auth.signOut()
      setError('Your account is inactive. Contact admin.')
      setLoading(false)
      return
    }

    document.cookie = `ace_remember=${rememberMe ? '1' : '0'}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`

    if (!rememberMe) {
      const token = crypto.randomUUID()
      document.cookie = `ace_session_token=${token}; path=/; SameSite=Lax`
    } else {
      document.cookie = 'ace_session_token=; path=/; max-age=0'
    }

    router.push(counselor.role === 'admin' ? '/admin' : '/dashboard')
    router.refresh()
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault()
    setResetMessage(null)
    setResetError(null)
    setResetLoading(true)

    const supabase = createClient()
    const { error: resetPasswordError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetPasswordError) {
      setResetError(resetPasswordError.message)
      setResetLoading(false)
      return
    }

    setResetMessage('Check your email for a reset link')
    setResetLoading(false)
  }

  const inputCls = 'glass-input min-h-[52px] w-full rounded-xl px-4 py-3 text-sm outline-none'

  return (
    <div className="flex min-h-screen items-center justify-center bg-grad-teal px-4 py-6">
      <div className="w-full rounded-[20px] glass-card-blue p-6 sm:max-w-[400px] sm:p-8">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="inline-flex items-center justify-center rounded-2xl bg-white/95 px-5 py-4 crisp">
            <img src="/logo.png" alt="ACE Altius Consulting" className="h-16 w-auto" />
          </div>
        </div>

        <h1 className="text-center text-2xl font-semibold text-white">Counselor Portal</h1>
        <p className="mt-1 text-center text-sm text-white/60">Sign in to your dashboard</p>

        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
            <div>
              <label htmlFor="reset-email" className="sr-only">Email</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Email"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="min-h-[52px] w-full rounded-full bg-grad-green crisp-on-dark py-3 text-sm font-bold text-text transition-all hover:brightness-110 disabled:opacity-60"
            >
              {resetLoading ? 'Sending...' : 'Send reset link'}
            </button>

            {resetMessage && (
              <p className="rounded-xl bg-green/20 px-4 py-2.5 text-center text-sm text-white" role="status">
                ✓ {resetMessage}
              </p>
            )}

            {resetError && (
              <p className="rounded-xl bg-red-500/20 px-4 py-2.5 text-center text-sm text-red-300" role="alert">
                {resetError}
              </p>
            )}

            <button
              type="button"
              onClick={() => { setShowForgotPassword(false); setResetMessage(null); setResetError(null) }}
              className="w-full text-center text-sm text-white/50 hover:text-white"
            >
              Back to login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={inputCls}
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-blue"
              />
              <label htmlFor="remember-me" className="cursor-pointer text-sm text-white/60">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[52px] w-full rounded-full bg-grad-green crisp-on-dark py-3 text-sm font-bold text-text transition-all hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>

            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="w-full text-center text-sm text-white/50 hover:text-white"
            >
              Forgot password?
            </button>

            {error && (
              <p className="rounded-xl bg-red-500/20 px-4 py-2.5 text-center text-sm text-red-300" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
