'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { PIPELINE_STAGES } from '@/lib/brief'
import type { PipelineStage, QualificationFactor } from '@/types'

type Props = {
  clientId: string
  initialStage: PipelineStage
  initialNotes: string
  initialEmail?: string | null
  initialStatus?: 'active' | 'suspended'
  isAdmin?: boolean
  initialManuallyQualified?: boolean
  initialQualificationFactors?: QualificationFactor[]
}

export function ClientControls({
  clientId,
  initialStage,
  initialNotes,
  initialEmail = null,
  initialStatus = 'active',
  isAdmin = false,
  initialManuallyQualified = false,
  initialQualificationFactors = [],
}: Props) {
  const [stage, setStage] = useState(initialStage)
  const [notes, setNotes] = useState(initialNotes)
  const [email, setEmail] = useState(initialEmail ?? '')
  const [saving, setSaving] = useState<'stage' | 'notes' | 'email' | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSaved, setEmailSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Counselor update / note state
  const [updateText, setUpdateText] = useState('')
  const [updateVisibility, setUpdateVisibility] = useState<'internal' | 'shared'>('internal')
  const [sendingUpdate, setSendingUpdate] = useState(false)
  const [updateSent, setUpdateSent] = useState(false)

  // Suspension
  const [status, setStatus] = useState(initialStatus)
  const [suspending, setSuspending] = useState(false)

  // Manual lead qualification (counselor's own judgment, separate from the AI score)
  const [manuallyQualified, setManuallyQualified] = useState(initialManuallyQualified)
  const [factors, setFactors] = useState<QualificationFactor[]>(initialQualificationFactors)
  const [newFactorLabel, setNewFactorLabel] = useState('')
  const [newFactorValue, setNewFactorValue] = useState('')
  const [qualifying, setQualifying] = useState(false)

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

  async function handleSaveEmail() {
    setEmailError(null)
    setEmailSaved(false)
    if (!email.trim()) {
      setEmailError('Email is required')
      return
    }
    setSaving('email')
    const res = await fetch('/api/clients/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, email: email.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(null)
    if (!res.ok) {
      setEmailError(data.error || 'Failed to save email')
      return
    }
    if (data.email) setEmail(data.email)
    setEmailSaved(true)
    startTransition(() => router.refresh())
    setTimeout(() => setEmailSaved(false), 2500)
  }

  function addQualificationFactor() {
    if (!newFactorLabel.trim() || !newFactorValue.trim()) return
    setFactors((prev) => [...prev, { label: newFactorLabel.trim(), value: newFactorValue.trim() }])
    setNewFactorLabel('')
    setNewFactorValue('')
  }

  function removeQualificationFactor(index: number) {
    setFactors((prev) => prev.filter((_, i) => i !== index))
  }

  async function saveQualification(qualified: boolean) {
    setQualifying(true)
    const res = await fetch(`/api/counselor/clients/${clientId}/qualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qualified, factors }),
    })
    setQualifying(false)
    if (res.ok) {
      setManuallyQualified(qualified)
      if (qualified && stage < 2) setStage(2 as PipelineStage)
      startTransition(() => router.refresh())
    }
  }

  async function handleToggleSuspension() {
    setSuspending(true)
    const action = status === 'active' ? 'suspend' : 'reactivate'
    const res = await fetch('/api/clients/suspend', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, action }),
    })
    setSuspending(false)
    if (res.ok) {
      const data = await res.json()
      setStatus(data.status)
      startTransition(() => router.refresh())
    }
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
    <div className="space-y-4 border-t border-white/10 pt-4">
      {/* Pipeline stage */}
      <div>
        <label
          htmlFor="pipeline-stage"
          className="mb-1 block text-sm font-medium text-white/70"
        >
          Pipeline stage
        </label>
        <select
          id="pipeline-stage"
          value={stage}
          disabled={isPending || saving === 'stage'}
          onChange={(e) => handleStageChange(Number(e.target.value))}
          className="min-h-[48px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input disabled:opacity-50"
        >
          {Object.entries(PIPELINE_STAGES).map(([value, label]) => (
            <option key={value} value={value}>
              Stage {value} — {label}
            </option>
          ))}
        </select>
      </div>

      {/* Manual lead qualification — counselor's own judgment call, separate
          from the AI-derived qualification_score shown at the top of the profile. */}
      <div className="rounded-xl border border-white/10 glass-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">Manual qualification</p>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              manuallyQualified ? 'bg-green/20 text-green' : 'bg-white/10 text-white/50'
            }`}
          >
            {manuallyQualified ? 'Qualified' : 'Not qualified'}
          </span>
        </div>

        {factors.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {factors.map((f, i) => (
              <li
                key={`${f.label}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/80"
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-white">{f.label}:</span> {f.value}
                </span>
                <button
                  type="button"
                  onClick={() => removeQualificationFactor(i)}
                  className="shrink-0 text-white/40 hover:text-white"
                  aria-label={`Remove ${f.label}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            value={newFactorLabel}
            onChange={(e) => setNewFactorLabel(e.target.value)}
            placeholder="Factor (e.g. Budget confirmed)"
            className="min-h-[40px] flex-1 rounded-xl px-3 py-2 text-xs outline-none glass-input"
          />
          <input
            value={newFactorValue}
            onChange={(e) => setNewFactorValue(e.target.value)}
            placeholder="Detail (e.g. Yes, 20k USD)"
            className="min-h-[40px] flex-1 rounded-xl px-3 py-2 text-xs outline-none glass-input"
          />
          <button
            type="button"
            onClick={addQualificationFactor}
            disabled={!newFactorLabel.trim() || !newFactorValue.trim()}
            className="min-h-[40px] rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-40"
          >
            + Add
          </button>
        </div>

        <button
          type="button"
          disabled={qualifying}
          onClick={() => saveQualification(!manuallyQualified)}
          className={`mt-3 min-h-[44px] w-full rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
            manuallyQualified
              ? 'border border-white/20 bg-white/10 text-white'
              : 'bg-green text-[#0A3F3A]'
          }`}
        >
          {qualifying
            ? 'Saving…'
            : manuallyQualified
              ? 'Remove qualification'
              : '✓ Mark as qualified'}
        </button>
      </div>

      {/* Contact email */}
      <div>
        <label
          htmlFor="client-email"
          className="mb-1 block text-sm font-medium text-white/70"
        >
          Contact email
        </label>
        <input
          id="client-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Optional — client can also add this in My Profile"
          className="min-h-[48px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
        />
        {emailError && (
          <p className="mt-1.5 text-xs text-red-300">{emailError}</p>
        )}
        <button
          type="button"
          disabled={isPending || saving === 'email'}
          onClick={handleSaveEmail}
          className="mt-2 min-h-[44px] w-full rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {saving === 'email' ? 'Saving…' : emailSaved ? '✓ Saved' : 'Save email'}
        </button>
      </div>

      {/* Internal notes (saved to clients.notes) */}
      <div>
        <label
          htmlFor="client-notes"
          className="mb-1 block text-sm font-medium text-white/70"
        >
          Internal notes
        </label>
        <textarea
          id="client-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-xl px-3 py-2 text-sm outline-none glass-input"
          placeholder="Add counselor notes…"
        />
        <button
          type="button"
          disabled={isPending || saving === 'notes'}
          onClick={handleSaveNotes}
          className="mt-2 min-h-[44px] w-full rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {saving === 'notes' ? 'Saving…' : 'Save internal notes'}
        </button>
      </div>

      {/* Add update / note with visibility toggle */}
      <div className="rounded-xl border border-white/10 glass-card p-4">
        <p className="mb-2 text-sm font-medium text-white/70">Add update or note</p>
        <textarea
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-xl px-3 py-2 text-sm outline-none glass-input"
          placeholder="Write an update or note…"
        />

        {/* Visibility toggle */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setUpdateVisibility('internal')}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
              updateVisibility === 'internal'
                ? 'border-white/20 bg-white/20 text-white'
                : 'border-white/20 glass-card text-white/50 hover:text-white'
            }`}
          >
            🔒 Internal only
          </button>
          <button
            type="button"
            onClick={() => setUpdateVisibility('shared')}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
              updateVisibility === 'shared'
                ? 'border-green bg-green text-[#0A3F3A]'
                : 'border-white/20 glass-card text-white/50 hover:text-white'
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
      {/* Suspension */}
      <div className="rounded-xl border border-white/10 glass-card p-4">
        <p className="mb-1 text-sm font-medium text-white/70">Account access</p>
        <p className="mb-3 text-xs text-white/40">
          {status === 'suspended'
            ? 'This client is suspended and cannot log in to the portal.'
            : 'This client has normal portal access.'}
        </p>
        <button
          type="button"
          disabled={suspending}
          onClick={handleToggleSuspension}
          className={`min-h-[44px] w-full rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
            status === 'suspended'
              ? 'bg-green/20 text-green border border-green/30'
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}
        >
          {suspending
            ? '…'
            : status === 'suspended'
            ? 'Reactivate account'
            : 'Suspend account'}
        </button>
      </div>
    </div>
  )
}
