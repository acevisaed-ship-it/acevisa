'use client'

import { useState, type FormEvent } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Props = {
  initialEmail: string | null
  /** Dark glass style (chat / teal backgrounds) vs light profile page */
  variant?: 'dark' | 'light'
  onSaved?: (email: string) => void
}

export function StudentEmailForm({ initialEmail, variant = 'light', onSaved }: Props) {
  const [email, setEmail] = useState(initialEmail ?? '')
  const [editing, setEditing] = useState(!initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [savedEmail, setSavedEmail] = useState(initialEmail)

  const isDark = variant === 'dark'
  const inputCls = isDark
    ? 'min-h-[44px] w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/40'
    : 'min-h-[44px] w-full rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm text-text outline-none placeholder:text-text/40 focus:border-blue'
  const labelCls = isDark
    ? 'mb-1 block text-xs font-medium text-white/60'
    : 'mb-1 block text-xs font-medium text-text/70'
  const mutedCls = isDark ? 'text-white/50' : 'text-text/50'
  const cardCls = isDark
    ? 'rounded-2xl border border-white/10 p-4'
    : 'rounded-[20px] border border-text/10 bg-white p-5 shadow-sm'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const res = await fetch('/api/student/profile/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          setError('Please sign in to the student portal to save your email.')
        } else {
          setError(data.error || 'Failed to save email')
        }
        return
      }

      setSavedEmail(data.email)
      setEmail(data.email)
      setEditing(false)
      setSuccess(savedEmail ? 'Email updated.' : 'Email added. You can now use it to log in and reset your password.')
      onSaved?.(data.email)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cardCls}
      style={isDark ? { background: 'rgba(238,238,237,0.10)' } : undefined}
    >
      <div className="mb-3 flex items-center gap-2">
        <Mail size={18} className={isDark ? 'text-green' : 'text-blue'} />
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-text'}`}>
          Email
        </h3>
      </div>

      {!editing && savedEmail ? (
        <div className="space-y-3">
          <p className={`break-all text-sm ${isDark ? 'text-white' : 'text-text'}`}>{savedEmail}</p>
          <p className={`text-xs ${mutedCls}`}>
            Used for login, password resets, and important updates.
          </p>
          <Button
            type="button"
            variant={isDark ? undefined : 'secondary'}
            className={isDark ? 'bg-white/10 text-white hover:bg-white/15' : undefined}
            onClick={() => {
              setEditing(true)
              setSuccess(null)
              setError(null)
            }}
          >
            Change email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="student-email" className={labelCls}>
              {savedEmail ? 'New email address' : 'Add your email (optional but recommended)'}
            </label>
            <input
              id="student-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@email.com"
              className={inputCls}
            />
            <p className={`mt-1.5 text-xs ${mutedCls}`}>
              {savedEmail
                ? 'After saving, use this email (or your phone) to sign in.'
                : 'Adding an email lets you reset your password and receive portal messages.'}
            </p>
          </div>

          {error && (
            <p className={`rounded-xl px-3 py-2 text-sm ${isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
              {error}
              {error.includes('sign in') && (
                <>
                  {' '}
                  <a href="/portal/login" className="underline">
                    Sign in
                  </a>
                </>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : savedEmail ? 'Save email' : 'Add email'}
            </Button>
            {savedEmail && (
              <Button
                type="button"
                variant="secondary"
                className={isDark ? 'bg-white/10 text-white hover:bg-white/15' : undefined}
                disabled={loading}
                onClick={() => {
                  setEditing(false)
                  setEmail(savedEmail)
                  setError(null)
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}

      {success && !editing && (
        <p className={`mt-3 text-sm ${isDark ? 'text-green' : 'text-blue'}`}>✓ {success}</p>
      )}
    </div>
  )
}
