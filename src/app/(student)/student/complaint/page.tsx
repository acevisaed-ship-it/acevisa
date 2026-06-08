'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function ComplaintForm() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [complaintId, setComplaintId] = useState('')

  useEffect(() => {
    if (!clientId) return

    fetch(`/api/complaints?clientId=${clientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.name) setClientName(data.name)
        if (data?.phone) setClientPhone(data.phone)
      })
      .catch(() => {})
  }, [clientId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!subject.trim() || !body.trim()) {
      setError('Subject and details are required.')
      return
    }

    if (!clientId && (!clientName.trim() || !clientPhone.trim())) {
      setError('Your name and phone are required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId || undefined,
          clientName: clientName.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
          subject: subject.trim(),
          body: body.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit complaint.')
        return
      }

      setComplaintId(data.complaintId)
      setSubmitted(true)
    } catch {
      setError('Failed to submit complaint. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <p className="text-5xl text-[#B7C733]">✅</p>
        <h2 className="mt-4 text-xl font-semibold text-[#0A3F3A]">
          Your complaint has been submitted.
        </h2>
        <p className="mt-2 text-sm text-[#0A3F3A]/70">
          Reference ID: {complaintId.slice(0, 8)}
        </p>
        <p className="mt-1 text-sm text-[#0A3F3A]/70">
          We&apos;ll be in touch within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-[#2083B9]">Raise a Complaint</h1>
      <p className="mt-2 text-sm text-[#0A3F3A]/70">
        We take every complaint seriously. A senior team member will review this within 24
        hours.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-[#0A3F3A]">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What is this about?"
            className="w-full rounded-xl border border-[#0A3F3A]/20 bg-white px-4 py-3 text-sm text-[#0A3F3A] placeholder:text-[#0A3F3A]/40"
          />
        </div>

        <div>
          <label htmlFor="details" className="mb-1.5 block text-sm font-medium text-[#0A3F3A]">
            Details
          </label>
          <textarea
            id="details"
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Please describe the issue in as much detail as possible."
            className="w-full resize-none rounded-xl border border-[#0A3F3A]/20 bg-white px-4 py-3 text-sm text-[#0A3F3A] placeholder:text-[#0A3F3A]/40"
          />
        </div>

        {!clientId && (
          <>
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[#0A3F3A]">
                Your name
              </label>
              <input
                id="name"
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-xl border border-[#0A3F3A]/20 bg-white px-4 py-3 text-sm text-[#0A3F3A]"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-[#0A3F3A]">
                Your phone
              </label>
              <input
                id="phone"
                type="text"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full rounded-xl border border-[#0A3F3A]/20 bg-white px-4 py-3 text-sm text-[#0A3F3A]"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#E48328] py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Complaint →'}
        </button>
      </form>
    </>
  )
}

export default function StudentComplaintPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E6E8E7] px-4 py-8">
      <div className="w-full max-w-[480px] rounded-2xl border border-[#0A3F3A]/10 bg-white/80 p-6">
        <Suspense
          fallback={
            <p className="text-center text-sm text-[#0A3F3A]/60">Loading...</p>
          }
        >
          <ComplaintForm />
        </Suspense>
      </div>
    </div>
  )
}
