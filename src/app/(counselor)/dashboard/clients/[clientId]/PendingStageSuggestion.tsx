'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export type PendingStageSuggestionData = {
  id: string
  current_stage: number
  suggested_stage: number
  reason: string | null
  created_at: string
}

type Props = {
  suggestions: PendingStageSuggestionData[]
}

const STAGE_NAMES: Record<number, string> = {
  1: 'New Lead',
  2: 'Qualified',
  3: 'Documents Requested',
  4: 'Application Prep',
  5: 'Submitted',
  6: 'Approved',
  7: 'Rejected',
  8: 'Closed',
}

function stageName(stage: number): string {
  return STAGE_NAMES[stage] ?? `Stage ${stage}`
}

/** AI proposes stage changes, but never writes them — a counselor has to sign
 * off here first. Mirrors PendingProfileUpdates' review pattern. */
export function PendingStageSuggestion({ suggestions }: Props) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (suggestions.length === 0) return null

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    setProcessing(`${id}:${status}`)
    const res = await fetch(`/api/stage-suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setProcessing(null)
    if (res.ok) {
      startTransition(() => router.refresh())
    }
  }

  const busy = isPending || processing !== null

  return (
    <section className="mb-6 rounded-2xl border-l-4 border-[#B7C733] bg-[#B7C733]/10 p-5">
      <h2 className="mb-1 text-lg font-bold text-white">AI Stage Suggestion</h2>
      <p className="mb-4 text-sm text-white/70">
        AI proposed moving this student forward. Confirm to apply, or reject to leave the stage as-is.
      </p>

      <div className="space-y-3">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className="flex flex-col gap-3 rounded-xl border border-[#B7C733]/20 glass-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/80">
                {stageName(s.current_stage)} → {stageName(s.suggested_stage)}
              </p>
              {s.reason && <p className="text-sm text-white/60">{s.reason}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleReview(s.id, 'approved')}
                className="min-h-[36px] rounded-full bg-grad-blue crisp-on-dark px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {processing === `${s.id}:approved` ? '…' : 'Confirm'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleReview(s.id, 'rejected')}
                className="min-h-[36px] rounded-full border border-white/20 glass-card px-4 py-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white disabled:opacity-50"
              >
                {processing === `${s.id}:rejected` ? '…' : 'Reject'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
