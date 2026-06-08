'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { PIPELINE_STAGES } from '@/lib/brief'
import type { PipelineStage } from '@/types'

type Props = {
  clientId: string
  initialStage: PipelineStage
  initialNotes: string
}

export function ClientControls({ clientId, initialStage, initialNotes }: Props) {
  const [stage, setStage] = useState(initialStage)
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState<'stage' | 'notes' | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function patchClient(body: Record<string, unknown>) {
    const res = await fetch('/api/clients/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, ...body }),
    })
    if (res.ok) {
      startTransition(() => router.refresh())
    }
    return res.ok
  }

  async function handleStageChange(newStage: number) {
    setStage(newStage as PipelineStage)
    setSaving('stage')
    await patchClient({ pipeline_stage: newStage })
    setSaving(null)
  }

  async function handleSaveNotes() {
    setSaving('notes')
    await patchClient({ notes })
    setSaving(null)
  }

  return (
    <div className="space-y-4 border-t border-text/10 pt-4">
      <div>
        <label
          htmlFor="pipeline-stage"
          className="mb-1 block text-sm font-medium text-text"
        >
          Pipeline stage
        </label>
        <select
          id="pipeline-stage"
          value={stage}
          disabled={isPending || saving === 'stage'}
          onChange={(e) => handleStageChange(Number(e.target.value))}
          className="min-h-[48px] w-full rounded-xl border border-text/20 bg-white px-3 py-2 text-sm text-text focus:border-blue focus:outline-none disabled:opacity-50"
        >
          {Object.entries(PIPELINE_STAGES).map(([value, label]) => (
            <option key={value} value={value}>
              Stage {value} — {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="client-notes"
          className="mb-1 block text-sm font-medium text-text"
        >
          Notes
        </label>
        <textarea
          id="client-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-xl border border-text/20 bg-white px-3 py-2 text-sm text-text focus:border-blue focus:outline-none"
          placeholder="Add counselor notes…"
        />
        <button
          type="button"
          disabled={isPending || saving === 'notes'}
          onClick={handleSaveNotes}
          className="mt-2 min-h-[44px] w-full rounded-full bg-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {saving === 'notes' ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  )
}
