'use client'

import { Suspense, useState, useEffect, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function SetupPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

      setLinkError('This setup link is invalid or has expired. Please request a new one from your counselor.')
    }

    ensureSession()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSessionReady(true)
        setLinkError(null)
      }
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Mark portal_password_set = true in clients table (via API)
    if (clientId) {
      await fetch('/api/student/auth/confirm-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
    }

    // Security confirmation — same as counselor / student reset flows
    fetch('/api/auth/notify-password-changed', { method: 'POST' }).catch(() => {})

    router.push(`/portal?clientId=${clientId}`)
    router.refresh()
  }

  const inputCls =
    'min-h-[52px] w-full rounded-xl border border-[#0A3F3A]/20 bg-[#E6E8E7] px-4 py-3 text-[#0A3F3A] outline-none focus:border-[#2083B9]'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A3F3A] px-4 py-8">
      <div className="w-full max-w-sm rounded-[24px] bg-[#E6E8E7] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-14 w-auto" />
        </div>

        <h1 className="text-center text-xl font-semibold text-[#0A3F3A]">Set your password</h1>
        <p className="mt-1 text-center text-sm text-[#0A3F3A]/50">
          Choose a password to access your student portal anytime.
        </p>

        {linkError ? (
          <div className="mt-8 space-y-3 text-center">
            <p className="text-sm text-red-600" role="alert">{linkError}</p>
            <a href="/portal/login" className="inline-block text-sm text-[#2083B9] hover:underline">
              Back to login
            </a>
          </div>
        ) : !sessionReady ? (
          <p className="mt-8 text-center text-sm text-[#0A3F3A]/50">Verifying your link…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="relative">
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[#0A3F3A]/70">
                New password
              </label>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={`${inputCls} pr-12`}
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute bottom-3.5 right-4 text-[#0A3F3A]/40 hover:text-[#0A3F3A]">
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium text-[#0A3F3A]/70">
                Confirm password
              </label>
              <input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className={`${inputCls} pr-12`}
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute bottom-3.5 right-4 text-[#0A3F3A]/40 hover:text-[#0A3F3A]">
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-[52px] w-full rounded-full bg-[#B7C733] py-3 text-sm font-bold text-[#0A3F3A] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Set password & enter portal →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A3F3A] px-4 py-8">
          <div className="w-full max-w-sm rounded-[24px] bg-[#E6E8E7] p-6 shadow-2xl sm:p-8">
            <p className="text-center text-sm text-[#0A3F3A]/50">Verifying your link…</p>
          </div>
        </div>
      }
    >
      <SetupPasswordForm />
    </Suspense>
  )
}
