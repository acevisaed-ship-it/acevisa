'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ClientInfoForm } from '@/components/receptionist/ClientInfoForm'
import {
  ClientIntakeEditor,
  mergeIntakeValues,
  type IntakeValues,
} from '@/components/receptionist/ClientIntakeEditor'
import {
  CORRECTABLE_FIELD_LABELS,
  isCorrectableField,
  snapshotValues,
  type ClientFormSnapshot,
  type CorrectableField,
} from '@/lib/receptionist/clientForm'

type SearchResult = {
  id: string
  name: string
  clientCode: string
  phone: string
  email: string | null
  counselorName: string
}

type CorrectionRequest = {
  id: string
  clientId: string
  clientName: string
  clientCode: string
  currentValues: Record<string, string>
  proposedChanges: Record<string, string>
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'cancelled'
  reviewNote: string | null
  createdAt: string
}

type Mode = 'search' | 'view' | 'request' | 'apply'

function statusLabel(status: CorrectionRequest['status']) {
  switch (status) {
    case 'pending':
      return 'Waiting for admin/CEO approval'
    case 'approved':
      return 'Approved — you can now change the information'
    case 'rejected':
      return 'Rejected'
    case 'applied':
      return 'Applied'
    case 'cancelled':
      return 'Cancelled'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function ReceptionistCorrectionRequest() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [mode, setMode] = useState<Mode>('search')
  const [client, setClient] = useState<ClientFormSnapshot | null>(null)
  const [duplicates, setDuplicates] = useState<ClientFormSnapshot[]>([])
  const [viewingDuplicate, setViewingDuplicate] = useState<ClientFormSnapshot | null>(null)
  const [form, setForm] = useState<IntakeValues | null>(null)
  const [reason, setReason] = useState('')
  const [loadingClient, setLoadingClient] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [requests, setRequests] = useState<CorrectionRequest[]>([])
  const [applyRequest, setApplyRequest] = useState<CorrectionRequest | null>(null)
  const [applyFields, setApplyFields] = useState<CorrectableField[]>([])

  async function loadRequests() {
    const res = await fetch('/api/receptionist/correction-requests')
    const data = await res.json()
    if (res.ok) setRequests(data.requests ?? [])
  }

  useEffect(() => {
    loadRequests()
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/receptionist/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  async function openClient(clientId: string, nextMode: Mode = 'view') {
    setLoadingClient(true)
    setMessage(null)
    setViewingDuplicate(null)
    try {
      const res = await fetch(`/api/receptionist/clients/${clientId}`)
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Could not load client' })
        return
      }
      const loaded = data.client as ClientFormSnapshot
      setClient(loaded)
      setDuplicates(data.duplicates ?? [])
      setForm(snapshotValues(loaded))
      setMode(nextMode)
      setQuery('')
      setResults([])
    } finally {
      setLoadingClient(false)
    }
  }

  function updateField(field: CorrectableField, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  async function submitRequest(e: FormEvent) {
    e.preventDefault()
    if (!client || !form) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/receptionist/correction-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, values: form, reason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to submit request' })
        if (data.duplicates) setDuplicates(data.duplicates)
        return
      }
      if (data.duplicates?.length) setDuplicates(data.duplicates)
      setMessage({
        type: 'success',
        text: 'Request sent. An admin or CEO must approve it before you can change this client.',
      })
      setMode('view')
      setReason('')
      loadRequests()
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again' })
    } finally {
      setSaving(false)
    }
  }

  async function startApply(req: CorrectionRequest) {
    setApplyRequest(req)
    const fields = Object.keys(req.proposedChanges).filter(isCorrectableField)
    setApplyFields(fields)
    await openClient(req.clientId, 'apply')
    setForm((prev) =>
      prev ? mergeIntakeValues(prev, req.proposedChanges as Partial<IntakeValues>) : prev
    )
  }

  async function applyChanges(e: FormEvent) {
    e.preventDefault()
    if (!applyRequest || !form) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/receptionist/correction-requests/${applyRequest.id}/apply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to apply changes' })
        if (data.duplicates) setDuplicates(data.duplicates)
        return
      }
      if (data.duplicates?.length) setDuplicates(data.duplicates)
      setMessage({ type: 'success', text: 'Client information updated.' })
      setMode('search')
      setClient(null)
      setApplyRequest(null)
      setForm(null)
      loadRequests()
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again' })
    } finally {
      setSaving(false)
    }
  }

  const approved = requests.filter((r) => r.status === 'approved')
  const recent = requests.filter((r) => r.status !== 'applied').slice(0, 8)

  return (
    <Card variant="dark" className="p-5">
      <p className="text-sm font-medium text-bg/70">Request a client information correction</p>
      <p className="mt-1 text-xs text-bg/50">
        Search by name, phone, email, or AV-code. Admin or CEO approval is required before you can change any field.
        If another client already uses the same name, phone, or email, you can open their full form below.
      </p>

      {approved.length > 0 && mode !== 'apply' && (
        <div className="mt-4 rounded-xl border border-orange/30 bg-orange/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange">
            Approved — apply these changes
          </p>
          <ul className="mt-2 space-y-2">
            {approved.map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-semibold">{req.clientName}</span>{' '}
                  <span className="text-bg/40">· {req.clientCode}</span>
                </span>
                <Button type="button" onClick={() => startApply(req)}>
                  Change information
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === 'search' && (
        <div className="relative mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, email, or AV-code"
            className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
          />
          {searching && <p className="mt-1 text-xs text-bg/40">Searching…</p>}
          {results.length > 1 && (
            <p className="mt-2 text-xs text-orange">
              {results.length} clients matched — open a record to view the full information form.
            </p>
          )}
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-bg/10 rounded-xl border border-bg/10">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openClient(r.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg/5"
                  >
                    <span>
                      <span className="font-semibold">{r.name}</span>{' '}
                      <span className="text-bg/40">· {r.clientCode}</span>
                      <span className="mt-0.5 block text-xs text-bg/40">
                        {r.phone}
                        {r.email ? ` · ${r.email}` : ''}
                      </span>
                    </span>
                    <span className="text-xs text-bg/40">{r.counselorName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loadingClient && <p className="mt-3 text-xs text-bg/40">Loading client form…</p>}

      {client && mode !== 'search' && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-bg">
              {client.name} <span className="font-normal text-bg/40">· {client.client_code}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setMode('search')
                setClient(null)
                setDuplicates([])
                setViewingDuplicate(null)
                setApplyRequest(null)
                setForm(null)
                setReason('')
              }}
              className="text-xs text-bg/40 hover:text-bg/70"
            >
              Back to search
            </button>
          </div>

          {mode === 'view' && (
            <>
              <ClientInfoForm client={client} title="Current information" />
              <Button type="button" onClick={() => setMode('request')}>
                Request correction
              </Button>
            </>
          )}

          {mode === 'request' && form && (
            <form onSubmit={submitRequest} className="space-y-4">
              <p className="text-xs text-bg/50">
                Change any field below. Nothing is saved until an admin or CEO approves, and you apply it.
              </p>
              <ClientIntakeEditor values={form} onChange={updateField} />
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">
                  Reason for correction
                </label>
                <input
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. spelling error on name, wrong phone number"
                  className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Sending…' : 'Send for approval'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setMode('view')}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {mode === 'apply' && form && applyRequest && (
            <form onSubmit={applyChanges} className="space-y-4">
              <p className="text-xs text-bg/50">
                Approved fields are unlocked. Update them now, then save.
              </p>
              <ul className="text-xs text-bg/60">
                {applyFields.map((field) => (
                  <li key={field}>
                    {CORRECTABLE_FIELD_LABELS[field]}:{' '}
                    <span className="text-bg/40">{applyRequest.currentValues[field] || '—'}</span>
                    {' → '}
                    <span className="font-semibold">{applyRequest.proposedChanges[field] || '—'}</span>
                  </li>
                ))}
              </ul>
              <ClientIntakeEditor
                values={form}
                onChange={updateField}
                editableFields={applyFields}
              />
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save corrected information'}
              </Button>
            </form>
          )}

          {duplicates.length > 0 && (
            <div className="border-t border-bg/10 pt-4">
              <p className="text-sm font-semibold text-orange">
                Another client already exists with the same name, phone, or email
              </p>
              <p className="mt-1 text-xs text-bg/50">
                Open a match to view their whole information form.
              </p>
              <ul className="mt-2 space-y-2">
                {duplicates.map((dup) => (
                  <li key={dup.id}>
                    <button
                      type="button"
                      onClick={() => setViewingDuplicate(dup)}
                      className="w-full rounded-xl border border-bg/10 px-3 py-2 text-left text-sm hover:bg-bg/5"
                    >
                      <span className="font-semibold">{dup.name}</span>{' '}
                      <span className="text-bg/40">· {dup.client_code}</span>
                      {dup.match_reasons && (
                        <span className="mt-0.5 block text-xs text-orange">
                          {dup.match_reasons.join(', ')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {viewingDuplicate && (
                <div className="mt-3">
                  <ClientInfoForm
                    client={viewingDuplicate}
                    title={`Existing client ${viewingDuplicate.client_code}`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message.text}
        </p>
      )}

      {recent.length > 0 && (
        <div className="mt-5 border-t border-bg/10 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-bg/40">Recent requests</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {recent.map((req) => (
              <li key={req.id} className="flex items-start justify-between gap-3">
                <span>
                  {req.clientName}{' '}
                  <span className="text-bg/40">· {req.clientCode}</span>
                  {req.reviewNote && req.status === 'rejected' && (
                    <span className="mt-0.5 block text-xs text-red-400">{req.reviewNote}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-bg/40">{statusLabel(req.status)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
