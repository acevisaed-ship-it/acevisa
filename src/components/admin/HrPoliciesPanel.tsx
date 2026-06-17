'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Edit2, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Policy = {
  id: string
  policy_type: string
  title: string
  content: string
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
}

const POLICY_TYPES = [
  { value: 'attendance', label: 'Attendance Policy' },
  { value: 'leave', label: 'Leave Policy' },
  { value: 'deduction', label: 'Deduction Policy' },
  { value: 'termination', label: 'Termination Policy' },
  { value: 'sop', label: 'SOP' },
]

function typeLabel(type: string) {
  return POLICY_TYPES.find((t) => t.value === type)?.label ?? type
}

const ALL_TYPES = ['all', ...POLICY_TYPES.map((t) => t.value)] as const

const inputClass = 'min-h-[44px] w-full rounded-full px-4 py-2 text-sm outline-none glass-input'

export function HrPoliciesPanel() {
  const [filter, setFilter] = useState<string>('all')
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [fType, setFType] = useState('attendance')
  const [fTitle, setFTitle] = useState('')
  const [fContent, setFContent] = useState('')

  // Edit state
  const [eTitle, setETitle] = useState('')
  const [eContent, setEContent] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = filter !== 'all' ? `?type=${filter}` : ''
      const res = await fetch(`/api/admin/hr/policies${qs}`)
      const data = await res.json()
      if (res.ok) setPolicies(data.policies ?? [])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!fTitle || !fContent) { setError('Title and content are required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/hr/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyType: fType, title: fTitle, content: fContent }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Create failed'); return }
      setCreateOpen(false)
      setFTitle(''); setFContent('')
      load()
    } catch { setError('Something went wrong') }
    finally { setSaving(false) }
  }

  async function handleEdit(id: string) {
    if (!eTitle || !eContent) { setError('Title and content required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/admin/hr/policies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: eTitle, content: eContent }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Update failed'); return }
      setEditingId(null)
      load()
    } catch { setError('Something went wrong') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this policy?')) return
    try {
      await fetch(`/api/admin/hr/policies/${id}`, { method: 'DELETE' })
      load()
    } catch { /* ignore */ }
  }

  async function handleToggleActive(policy: Policy) {
    await fetch(`/api/admin/hr/policies/${policy.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !policy.is_active }),
    })
    load()
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-2xl tab-container p-1 w-fit max-w-full">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={cn(
                'min-h-[36px] whitespace-nowrap rounded-xl px-3 text-xs font-medium capitalize transition-colors',
                filter === t ? 'tab-btn-active' : 'tab-btn-inactive'
              )}
            >
              {t === 'all' ? 'All' : typeLabel(t)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setFType('attendance'); setFTitle(''); setFContent(''); setError(''); setCreateOpen(true) }}
          className="flex items-center gap-1.5 min-h-[44px] rounded-full bg-grad-blue crisp-on-dark px-4 text-sm font-semibold text-white w-fit"
        >
          <Plus className="h-4 w-4" />
          New Policy
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-white/50">Loading…</p>
      ) : policies.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">No policies found. Create your first one.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {policies.map((policy) => {
            const isExpanded = expanded === policy.id
            const isEditing = editingId === policy.id
            return (
              <div key={policy.id} className="rounded-2xl border border-white/10 glass-card crisp-on-dark overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : policy.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold rounded-full bg-blue/20 text-white px-2.5 py-0.5">{typeLabel(policy.policy_type)}</span>
                      {!policy.is_active && <span className="text-xs rounded-full glass-card text-white/40 px-2 py-0.5">Inactive</span>}
                      <span className="text-xs text-white/40">v{policy.version}</span>
                    </div>
                    <p className="font-semibold text-white/80 mt-1">{policy.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">Updated {new Date(policy.updated_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => { setETitle(policy.title); setEContent(policy.content); setError(''); setEditingId(policy.id); setExpanded(policy.id) }}
                      className="flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/50 hover:text-white"
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(policy)}
                      className="rounded-full border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/50 hover:text-white"
                    >
                      {policy.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(policy.id)}
                      className="flex items-center justify-center min-h-[32px] min-w-[32px] rounded-full text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
                  </div>
                </div>

                {isExpanded && !isEditing && (
                  <div className="border-t border-white/5 px-5 py-4">
                    <p className="whitespace-pre-wrap text-sm text-white/70">{policy.content}</p>
                  </div>
                )}

                {isEditing && (
                  <div className="border-t border-white/5 px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    {error && <p className="mb-3 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-400">{error}</p>}
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">Title</label>
                        <input type="text" value={eTitle} onChange={(e) => setETitle(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">Content</label>
                        <textarea value={eContent} onChange={(e) => setEContent(e.target.value)} rows={8} className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-y font-mono glass-input" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => handleEdit(policy.id)} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}</button>
                      <button type="button" onClick={() => setEditingId(null)} className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/50"><X className="h-4 w-4" />Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4" onClick={() => setCreateOpen(false)} role="presentation">
          <div className="flex h-full w-full flex-col overflow-y-auto dark-modal p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[20px]" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">New Policy / SOP</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {error && <p className="mb-3 rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-400">{error}</p>}
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Policy Type</label>
                <select value={fType} onChange={(e) => setFType(e.target.value)} className={inputClass}>
                  {POLICY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Title</label>
                <input type="text" value={fTitle} onChange={(e) => setFTitle(e.target.value)} className={inputClass} placeholder="e.g. Annual Leave Policy v1" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Content</label>
                <textarea value={fContent} onChange={(e) => setFContent(e.target.value)} rows={10} placeholder="Write the full policy text here…" className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-y glass-input" />
              </div>
            </div>
            <button type="button" onClick={handleCreate} disabled={saving} className="mt-6 flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-grad-blue crisp-on-dark px-6 text-sm font-semibold text-white disabled:opacity-50">
              <Check className="h-4 w-4" />
              {saving ? 'Creating…' : 'Create Policy'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
