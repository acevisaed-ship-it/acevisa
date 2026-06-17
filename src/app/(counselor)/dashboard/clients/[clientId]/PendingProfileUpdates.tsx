'use client'

import { PROFILE_FIELD_LABELS } from '@/lib/profileUpdates'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export type PendingProfileUpdate = {
  id: string
  triggered_by_message: string
  proposed_changes: Record<string, string>
  reviewed_fields: Record<string, string>
  created_at: string
}

type Props = {
  updates: PendingProfileUpdate[]
}

export function PendingProfileUpdates({ updates }: Props) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (updates.length === 0) return null

  async function handleReview(
    requestId: string,
    field: string,
    status: 'approved' | 'rejected'
  ) {
    setProcessing(`${requestId}:${field}:${status}`)
    const res = await fetch(`/api/profile-updates/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, field }),
    })
    setProcessing(null)
    if (res.ok) {
      startTransition(() => router.refresh())
    }
  }

  return (
    <section className="mb-6 rounded-2xl border-l-4 border-orange bg-orange/10 p-5">
      <h2 className="mb-1 text-lg font-bold text-white">Pending Updates</h2>
      <p className="mb-4 text-sm text-white/70">
        This student shared new information in chat. Review and approve or reject below.
      </p>

      <div className="space-y-4">
        {updates.map((request) => {
          const pendingFields = Object.entries(request.proposed_changes).filter(
            ([field]) => !request.reviewed_fields[field]
          )

          if (pendingFields.length === 0) return null

          return (
            <div
              key={request.id}
              className="rounded-xl border border-orange/20 glass-card p-4"
            >
              <p className="mb-3 text-xs text-white/50">
                From chat: &ldquo;{request.triggered_by_message.substring(0, 120)}
                {request.triggered_by_message.length > 120 ? '…' : ''}&rdquo;
              </p>
              <ul className="space-y-3">
                {pendingFields.map(([field, rawMatch]) => {
                  const busy = isPending || processing !== null
                  return (
                    <li
                      key={field}
                      className="flex flex-col gap-3 rounded-lg glass-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/80">
                          {PROFILE_FIELD_LABELS[field] ?? field}
                        </p>
                        <p className="text-sm text-white/60">&ldquo;{rawMatch}&rdquo;</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleReview(request.id, field, 'approved')}
                          className="min-h-[36px] rounded-full bg-grad-blue crisp-on-dark px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {processing === `${request.id}:${field}:approved`
                            ? '…'
                            : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleReview(request.id, field, 'rejected')}
                          className="min-h-[36px] rounded-full border border-white/20 glass-card px-4 py-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white disabled:opacity-50"
                        >
                          {processing === `${request.id}:${field}:rejected`
                            ? '…'
                            : 'Reject'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
