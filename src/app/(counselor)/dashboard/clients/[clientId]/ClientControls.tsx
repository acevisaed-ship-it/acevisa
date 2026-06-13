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

  // Counselor update / note state
  const [updateText, setUpdateText] = useState('')
  const [updateVisibility, setUpdateVisibility] = useState<'internal' | 'shared'>('internal')
  const [sendingUpdate, setSendingUpdate] = useState(false)
  const [updateSent, setUpdateSent] = useState(false)

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

  async function handleSendUpdate() {
    if (!updateText.trim()) return
    setSendingUpdate(true)
    const res = await fetch('/api/counselor/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, text: updateText.trim(), visibility: updateVisibility }),
    })
    setSendingUpdate(false)
    if (res.ok) {
      setUpdateText('')
      setUpdateSent(true)
      setTimeout(() => setUpdateSent(false), 3000)
    }
  }

  return (
    <div className="space-y-4 border-t border-text/10 pt-4">
      {/* Pipeline stage */}
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

      {/* Internal notes (saved to clients.notes) */}
      <div>
        <label
          htmlFor="client-notes"
          className="mb-1 block text-sm font-medium text-text"
        >
          Internal notes
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
          {saving === 'notes' ? 'Saving…' : 'Save internal notes'}
        </button>
      </div>

      {/* Add update / note with visibility toggle */}
      <div className="rounded-xl border border-text/10 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-text">Add update or note</p>
        <textarea
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-xl border border-text/20 bg-bg px-3 py-2 text-sm text-text focus:border-blue focus:outline-none"
          placeholder="Write an update or note…"
        />

        {/* Visibility toggle */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setUpdateVisibility('internal')}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
              updateVisibility === 'internal'
                ? 'border-text/40 bg-text text-white'
                : 'border-text/20 bg-white text-text hover:bg-text/5'
            }`}
          >
            🔒 Internal only
          </button>
          <button
            type="button"
            onClick={() => setUpdateVisibility('shared')}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
              updateVisibility === 'shared'
                ? 'border-green bg-green text-white'
                : 'border-text/20 bg-white text-text hover:bg-text/5'
            }`}
          >
            👁 Share with client
          </button>
        </div>

        <button
          type="button"
          disabled={!updateText.trim() || sendingUpdate}
          onClick={handleSendUpdate}
          className="mt-3 min-h-[44px] w-full rounded-full bg-orange px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {sendingUpdate ? 'Saving…' : updateSent ? '✓ Saved!' : 'Save update'}
        </button>
      </div>
    </div>
  )
}
