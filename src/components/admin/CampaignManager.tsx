'use client'

import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Check, Copy, Pencil, Plus, X } from 'lucide-react'
import { CAMPAIGN_SERVICES, type CampaignService } from '@/lib/admin/categories'
import { cn } from '@/lib/utils'

type CounselorOption = { id: string; name: string }

type Campaign = {
  id: string
  campaign_name: string
  ad_source_code: string
  opening_line: string
  context_hint: string | null
  target_country: string | null
  target_service: string | null
  default_counselor_id: string | null
  counselor_name: string | null
  is_active: boolean
  created_at: string
}

type FormState = {
  campaign_name: string
  ad_source_code: string
  opening_line: string
  context_hint: string
  target_country: string
  target_service: CampaignService | ''
  default_counselor_id: string
  is_active: boolean
}

const emptyForm: FormState = {
  campaign_name: '',
  ad_source_code: '',
  opening_line: '',
  context_hint: '',
  target_country: '',
  target_service: '',
  default_counselor_id: '',
  is_active: true,
}

const inputClass =
  'min-h-[48px] w-full rounded-full border border-text bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-blue'

const LANDING_BASE = 'https://acevisa.co/?src='

export function CampaignManager({ counselors }: { counselors: CounselorOption[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedUrl, setSavedUrl] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/campaigns')
      const data = await res.json()
      if (res.ok) setCampaigns(data.campaigns ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setSavedUrl(null)
    setError('')
    setModalOpen(true)
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign)
    setForm({
      campaign_name: campaign.campaign_name,
      ad_source_code: campaign.ad_source_code,
      opening_line: campaign.opening_line,
      context_hint: campaign.context_hint ?? '',
      target_country: campaign.target_country ?? '',
      target_service: (campaign.target_service as CampaignService) ?? '',
      default_counselor_id: campaign.default_counselor_id ?? '',
      is_active: campaign.is_active,
    })
    setSavedUrl(`${LANDING_BASE}${campaign.ad_source_code}`)
    setError('')
    setModalOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      target_service: form.target_service || null,
      default_counselor_id: form.default_counselor_id || null,
    }

    try {
      const url = editing ? `/api/admin/campaigns/${editing.id}` : '/api/admin/campaigns'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Save failed')
        return
      }

      const campaign = data.campaign as Campaign
      if (editing) {
        setCampaigns((current) =>
          current.map((c) => (c.id === editing.id ? campaign : c))
        )
      } else {
        setCampaigns((current) => [campaign, ...current])
      }
      setSavedUrl(`${LANDING_BASE}${campaign.ad_source_code}`)
      setEditing(campaign)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(campaign: Campaign) {
    const res = await fetch(`/api/admin/campaigns/${campaign.id}/toggle`, { method: 'PATCH' })
    const data = await res.json()
    if (res.ok) {
      setCampaigns((current) =>
        current.map((c) => (c.id === campaign.id ? data.campaign : c))
      )
    }
  }

  async function copyCode(code: string, id: string) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
  }

  function counselorLabel(campaign: Campaign) {
    return campaign.counselor_name ?? 'Admin Pool'
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue md:text-3xl">Campaigns</h1>
          <p className="mt-1 text-sm text-text/60">
            {campaigns.filter((c) => c.is_active).length} active campaign
            {campaigns.filter((c) => c.is_active).length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-text"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-text/60">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <p className="mt-8 text-text/60">No campaigns yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-text/10 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-text/10 text-text/60">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Ad Source</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Counselor</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className={cn(
                    'border-b border-text/5 last:border-0',
                    !campaign.is_active && 'opacity-50'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-text">{campaign.campaign_name}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => copyCode(campaign.ad_source_code, campaign.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue/10 px-3 py-1 font-mono text-xs text-blue"
                    >
                      {campaign.ad_source_code}
                      {copiedId === campaign.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-text/70">
                    {[campaign.target_country, campaign.target_service]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-text/70">{counselorLabel(campaign)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(campaign)}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        campaign.is_active ? 'bg-green' : 'bg-text/20'
                      )}
                      aria-label={campaign.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                          campaign.is_active ? 'left-5' : 'left-0.5'
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openEdit(campaign)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-blue"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            className="flex h-full w-full flex-col overflow-y-auto bg-bg p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-blue">
                {editing ? 'Edit Campaign' : 'New Campaign'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-text">Campaign Name</label>
                <input
                  value={form.campaign_name}
                  onChange={(e) => setForm((f) => ({ ...f, campaign_name: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Ad Source Code</label>
                <input
                  value={form.ad_source_code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      ad_source_code: e.target.value.toLowerCase().replace(/\s/g, '_'),
                    }))
                  }
                  placeholder="meta_uk_aug2025"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Opening Line</label>
                <textarea
                  value={form.opening_line}
                  onChange={(e) => setForm((f) => ({ ...f, opening_line: e.target.value }))}
                  rows={3}
                  placeholder="Hi [name]! ..."
                  className="w-full resize-none rounded-2xl border border-text bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-blue"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Context Hint</label>
                <input
                  value={form.context_hint}
                  onChange={(e) => setForm((f) => ({ ...f, context_hint: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Target Country (optional)</label>
                <input
                  value={form.target_country}
                  onChange={(e) => setForm((f) => ({ ...f, target_country: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Target Service</label>
                <select
                  value={form.target_service}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      target_service: e.target.value as CampaignService | '',
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Not specified</option>
                  {CAMPAIGN_SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Assign to Counselor</label>
                <select
                  value={form.default_counselor_id}
                  onChange={(e) => setForm((f) => ({ ...f, default_counselor_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Admin Pool</option>
                  {counselors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4"
                />
                Active
              </label>

              {savedUrl && (
                <div className="rounded-2xl border border-green/30 bg-green/10 p-4">
                  <p className="text-xs font-medium text-text/60">Landing page URL</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 break-all text-xs text-text">{savedUrl}</code>
                    <button
                      type="button"
                      onClick={() => copyUrl(savedUrl)}
                      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-white text-blue"
                      aria-label="Copy URL"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-orange">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
