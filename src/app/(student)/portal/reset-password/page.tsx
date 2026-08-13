'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SectionOrangePlaneToLogo } from '@/components/landing/HeroAnimations'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function ensureSession() {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) {
        setSessionReady(true)
        return
      }

      await new Promise((r) => setTimeout(r, 400))
      const again = await supabase.auth.getSession()
      if (cancelled) return
      if (again.data.session) {
        setSessionReady(true)
        return
      }

      setLinkError('This reset link is invalid or has expired. Please request a new one.')
    }

    ensureSession()

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setSessionReady(true)
        setLinkError(null)
      }
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => {
      router.push('/portal/login')
    }, 2000)
    return () => clearTimeout(timer)
  }, [success, router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    if (clientId) {
      await fetch('/api/student/auth/confirm-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      }).catch(() => {})
    }

    fetch('/api/auth/notify-password-changed', { method: 'POST' }).catch(() => {})

    setSuccess(true)
    setLoading(false)
  }

  const inputCls = 'glass-input min-h-[52px] w-full rounded-xl px-4 py-3 text-sm outline-none'

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
      style={{ background: 'var(--grad-blue)' }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <SectionOrangePlaneToLogo />
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-[24px] glass-card-blue p-6 sm:p-8">
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/80 px-3 py-2 backdrop-blur-md crisp">
            <img src="/logo.png" alt="ACE Altius Consulting" className="h-12 w-auto" />
          </div>
        </div>

        <h1 className="text-center text-2xl font-semibold text-white">Reset Password</h1>
        <p className="mt-1 text-center text-sm text-white/60">Choose a new password for your portal</p>

        {success ? (
          <p className="mt-8 text-center text-sm text-[#B7C733]" role="status">
            Password updated! Redirecting to login…
          </p>
        ) : linkError ? (
          <div className="mt-8 space-y-4 text-center">
            <p className="text-sm text-orange" role="alert">{linkError}</p>
            <a href="/portal/login" className="inline-block text-sm text-white/60 hover:text-white hover:underline">
              Back to login
            </a>
          </div>
        ) : !sessionReady ? (
          <p className="mt-8 text-center text-sm text-white/60">Verifying your reset link…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="relative">
              <label htmlFor="new-password" className="sr-only">
                New password
              </label>
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min. 8 characters)"
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <label htmlFor="confirm-password" className="sr-only">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-grad-green crisp-on-dark py-3 text-sm font-bold text-text transition-all hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>

            {error && (
              <p className="text-center text-sm text-orange" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default function StudentResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center px-4 py-8"
          style={{ background: 'var(--grad-blue)' }}
        >
          <p className="text-sm text-white/60">Loading…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
