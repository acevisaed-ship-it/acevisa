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
    <section className="mb-6 rounded-2xl border-l-4 border-[#E48328] bg-[#E48328]/20 p-5">
      <h2 className="mb-1 text-lg font-bold text-text">Pending Updates</h2>
      <p className="mb-4 text-sm text-text/80">
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
              className="rounded-xl border border-[#E48328]/30 bg-white/60 p-4"
            >
              <p className="mb-3 text-xs text-text/60">
                From chat: &ldquo;{request.triggered_by_message.substring(0, 120)}
                {request.triggered_by_message.length > 120 ? '…' : ''}&rdquo;
              </p>
              <ul className="space-y-3">
                {pendingFields.map(([field, rawMatch]) => {
                  const busy = isPending || processing !== null
                  return (
                    <li
                      key={field}
                      className="flex flex-col gap-3 rounded-lg bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text">
                          {PROFILE_FIELD_LABELS[field] ?? field}
                        </p>
                        <p className="text-sm text-text/70">&ldquo;{rawMatch}&rdquo;</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleReview(request.id, field, 'approved')}
                          className="min-h-[36px] rounded-full bg-blue px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {processing === `${request.id}:${field}:approved`
                            ? '…'
                            : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleReview(request.id, field, 'rejected')}
                          className="min-h-[36px] rounded-full border border-text/20 bg-white px-4 py-1.5 text-xs font-medium text-text transition-colors hover:border-text/40 disabled:opacity-50"
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
