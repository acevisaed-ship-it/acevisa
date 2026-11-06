'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

type TermsDoc = {
  id: string
  scope: 'general' | 'product'
  product_id: string | null
  title: string
  body: string
  version: number
  is_active: boolean
  published_at: string | null
  created_at: string
}

type ProductOption = { id: string; name: string }

export function TermsEditor({ isCeo }: { isCeo: boolean }) {
  const [documents, setDocuments] = useState<TermsDoc[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedKey, setSelectedKey] = useState<'general' | string>('general')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [publishCount, setPublishCount] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/terms')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load terms')
        return
      }
      setDocuments(data.documents ?? [])
      setProducts(data.products ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const groups = useMemo(() => {
    const general = documents.filter((d) => d.scope === 'general')
    const byProduct = new Map<string, TermsDoc[]>()
    for (const doc of documents) {
      if (doc.scope !== 'product' || !doc.product_id) continue
      const list = byProduct.get(doc.product_id) ?? []
      list.push(doc)
      byProduct.set(doc.product_id, list)
    }
    return { general, byProduct }
  }, [documents])

  const currentList =
    selectedKey === 'general' ? groups.general : (groups.byProduct.get(selectedKey) ?? [])
  const draft = currentList.find((d) => !d.published_at)
  const active = currentList.find((d) => d.is_active)

  useEffect(() => {
    const source = draft ?? active ?? currentList[0]
    setEditingId(source?.id ?? null)
    setTitle(source?.title ?? (selectedKey === 'general' ? 'Terms of Service' : 'Service policy'))
    setBody(source?.body ?? 'DRAFT - PENDING OWNER AND LEGAL REVIEW\n\n')
    setPublishCount(null)
    setError('')
  }, [selectedKey, documents]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveDraft(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingId && draft && draft.id === editingId) {
        const res = await fetch(`/api/admin/terms/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to save draft')
          return
        }
      } else {
        const res = await fetch('/api/admin/terms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: selectedKey === 'general' ? 'general' : 'product',
            product_id: selectedKey === 'general' ? null : selectedKey,
            title,
            body,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to create draft')
          return
        }
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function preparePublish() {
    if (!editingId || !isCeo) return
    const res = await fetch(`/api/admin/terms/${editingId}/publish`)
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to check publish impact')
      return
    }
    setPublishCount(data.clientsAffected ?? 0)
  }

  async function confirmPublish() {
    if (!editingId || !isCeo) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/terms/${editingId}/publish`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to publish')
        return
      }
      setPublishCount(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-[20px] border border-white/10 glass-card p-3">
        <p className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-white/40">Documents</p>
        <button
          type="button"
          onClick={() => setSelectedKey('general')}
          className={cn(
            'flex min-h-[44px] w-full items-center rounded-xl px-3 text-left text-sm',
            selectedKey === 'general' ? 'bg-green/20 text-white' : 'text-white/70 hover:bg-white/10'
          )}
        >
          Terms of service
        </button>
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedKey(p.id)}
            className={cn(
              'flex min-h-[44px] w-full items-center rounded-xl px-3 text-left text-sm',
              selectedKey === p.id ? 'bg-green/20 text-white' : 'text-white/70 hover:bg-white/10'
            )}
          >
            {p.name}
          </button>
        ))}
      </aside>

      <form onSubmit={handleSaveDraft} className="space-y-4 rounded-[20px] border border-white/10 glass-card p-6">
        {loading ? (
          <p className="text-white/50">Loading…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{title || 'Untitled'}</h2>
                <p className="text-xs text-white/50">
                  {active ? `Published v${active.version}` : 'No published version'}
                  {draft ? ' · unpublished draft' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="min-h-[44px] rounded-full border border-white/20 px-4 text-sm text-white/70"
              >
                {historyOpen ? 'Hide history' : 'View history'}
              </button>
            </div>

            <p className="rounded-2xl bg-orange/15 px-4 py-3 text-xs text-orange">
              Placeholder wording is marked DRAFT until the owner and a lawyer replace it. Sending an
              invoice is blocked until the relevant policy is published.
            </p>

            <div>
              <label className="mb-1.5 block text-sm text-white/70">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="min-h-[48px] w-full rounded-full px-4 text-sm outline-none glass-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-white/70">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={16}
                className="w-full resize-y rounded-2xl px-4 py-3 text-sm outline-none glass-input"
              />
            </div>

            {error && <p className="text-sm text-orange">{error}</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="min-h-[48px] rounded-full border border-white/20 px-5 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : draft ? 'Save draft' : 'Save as new draft'}
              </button>
              {isCeo && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={preparePublish}
                  className="min-h-[48px] rounded-full bg-green px-5 text-sm font-bold text-text disabled:opacity-50"
                >
                  Publish this version
                </button>
              )}
            </div>

            {publishCount !== null && (
              <div className="rounded-2xl border border-orange/40 bg-orange/10 p-4 text-sm text-white">
                <p>
                  Publishing a new version means {publishCount} client
                  {publishCount === 1 ? '' : 's'} who already agreed will need to agree again before the
                  next invoice for this {selectedKey === 'general' ? 'terms of service' : 'product'}.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={confirmPublish}
                    className="min-h-[44px] rounded-full bg-orange px-4 text-sm font-bold text-white"
                  >
                    Confirm publish
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishCount(null)}
                    className="min-h-[44px] rounded-full px-4 text-sm text-white/70"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {historyOpen && (
              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-white/40">History</p>
                {currentList.length === 0 ? (
                  <p className="text-sm text-white/50">No versions yet.</p>
                ) : (
                  currentList.map((doc) => (
                    <div key={doc.id} className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/70">
                      v{doc.version} · {doc.is_active ? 'active' : doc.published_at ? 'superseded' : 'draft'}
                      {doc.published_at
                        ? ` · published ${new Date(doc.published_at).toLocaleDateString('en-PK')}`
                        : ''}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </form>
    </div>
  )
}
