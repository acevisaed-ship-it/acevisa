'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'

const inputClass =
  'w-full rounded-card border border-text/20 bg-bg px-4 py-3.5 text-base text-text placeholder:text-text/40 outline-none transition-colors duration-700 focus:border-blue'

export default function ReturnPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (!res.ok || !data.clientId) {
        setError('No account found with that number. Did you register yet?')
        return
      }

      window.location.href = `/chat/${data.clientId}`
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="bg-texture flex min-h-screen items-center justify-center bg-bg px-5 py-24">
      <div
        className="w-full max-w-[400px] rounded-[20px] border border-text/10 bg-white/80 p-8 shadow-sm"
        style={{ background: 'rgba(255,255,255,0.9)' }}
      >
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-16 w-auto" />
        </div>

        <h1 className="text-center text-2xl font-semibold text-blue">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-text">
          Enter your phone number to continue your session.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm text-text">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              required
              placeholder="03XX XXXXXXX"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-orange">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-base font-bold"
          >
            {loading ? 'Looking up your session...' : 'Continue →'}
          </Button>
        </form>
      </div>
    </main>
  )
}
