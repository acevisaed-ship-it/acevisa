'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => {
      router.push('/login')
    }, 2000)
    return () => clearTimeout(timer)
  }, [success, router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

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

    setSuccess(true)
    setLoading(false)
  }

  const inputClassName =
    'w-full rounded-xl bg-grad-bg crisp px-4 py-3 text-text outline-none focus:ring-1 focus:ring-blue/40'

  return (
    <div className="flex min-h-screen items-center justify-center bg-grad-teal px-4">
      <div className="w-full max-w-[400px] rounded-[20px] bg-grad-bg crisp p-8">
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-16 w-auto" />
        </div>

        <h1 className="text-center text-2xl font-semibold text-blue">Reset Password</h1>
        <p className="mt-1 text-center text-sm text-text">Enter your new password</p>

        {success ? (
          <p className="mt-8 text-center text-sm text-green" role="status">
            Password updated!
          </p>
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
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className={`${inputClassName} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text/60 hover:text-text"
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
                className={`${inputClassName} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text/60 hover:text-text"
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
              {loading ? 'Updating...' : 'Update password'}
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
