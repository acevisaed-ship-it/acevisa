'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type TermsBlock = { title: string; version: number; body: string }

type AgreePayload = {
  firstName: string
  productName: string
  general: TermsBlock | null
  product: TermsBlock | null
}

const INVALID_COPY = 'This link is invalid or has expired.'

export default function AgreeTermsPage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AgreePayload | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [nameTyped, setNameTyped] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/agree/${encodeURIComponent(token)}`)
        const json = await res.json()
        if (cancelled) return
        if (!res.ok || !json.ok) {
          setError(INVALID_COPY)
          setData(null)
          return
        }
        setData({
          firstName: json.firstName,
          productName: json.productName,
          general: json.general,
          product: json.product,
        })
        setError(null)
      } catch {
        if (!cancelled) setError(INVALID_COPY)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!accepted) {
      setError('Please confirm that you have read and agree to the terms.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/agree/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true, nameTyped }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || INVALID_COPY)
        return
      }
      setDone(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 inline-flex items-center justify-center rounded-xl bg-white/95 px-2.5 py-1.5">
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-16 w-auto" />
        </div>

        {loading ? (
          <p className="text-text/60">Loading…</p>
        ) : done && data ? (
          <div className="rounded-[20px] bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-text">Thank you, {data.firstName}</h1>
            <p className="mt-3 text-sm text-text/70">
              Your agreement for {data.productName} has been recorded. Your invoice will be emailed to you
              shortly.
            </p>
          </div>
        ) : error && !data ? (
          <div className="rounded-[20px] bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-text">Unable to continue</h1>
            <p className="mt-3 text-sm text-text/70">{error}</p>
          </div>
        ) : data ? (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-[20px] bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-orange">Terms agreement</p>
              <h1 className="mt-1 text-2xl font-semibold text-text">Hi {data.firstName}</h1>
              <p className="mt-2 text-sm text-text/70">
                Please read the policy for {data.productName} and our terms of service. You will receive the
                invoice only after you agree.
              </p>
            </div>

            {data.product && (
              <section>
                <h2 className="text-sm font-bold text-text">
                  {data.product.title} · v{data.product.version}
                </h2>
                <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-bg p-4 font-sans text-sm leading-relaxed text-text">
                  {data.product.body}
                </pre>
              </section>
            )}

            {data.general && (
              <section>
                <h2 className="text-sm font-bold text-text">
                  {data.general.title} · v{data.general.version}
                </h2>
                <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-bg p-4 font-sans text-sm leading-relaxed text-text">
                  {data.general.body}
                </pre>
              </section>
            )}

            <label className="flex min-h-[44px] items-start gap-3 text-sm text-text">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 h-4 w-4"
                required
              />
              <span>
                I have read the product policy and the terms of service, and I agree to them. This is a
                record of my agreement, not legal advice.
              </span>
            </label>

            <div>
              <label className="mb-1.5 block text-sm text-text/70">Type your name (optional)</label>
              <input
                value={nameTyped}
                onChange={(e) => setNameTyped(e.target.value)}
                className="min-h-[48px] w-full rounded-full border border-text/10 bg-bg px-4 text-sm text-text outline-none"
              />
            </div>

            {error && <p className="text-sm text-orange">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !accepted}
              className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text disabled:opacity-50"
            >
              {submitting ? 'Recording…' : 'I agree'}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  )
}
