'use client'

import { useEffect, useState } from 'react'

type Document = {
  id: string
  title: string
  category: 'Country Deck' | 'Visa Guidebook'
  country: string | null
  description: string | null
  file_size: number | null
  mime_type: string | null
  added_at: string
  is_active: boolean
}

const inputCls = 'min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input'

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

// Self-gating: this section only ever renders for the 'ceo' role. It's
// embedded inside the existing KnowledgeBaseManager page (not a separate
// nav item/page) so it shows up in the same Knowledge Base tab everyone
// already uses -- but the underlying API (requireCeoApi) returns 403 for
// anyone who isn't CEO, and on that 403 this component renders nothing at
// all, so Admins (Branch Managers) see the page exactly as before.
export function CeoKnowledgeBaseManager() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState<boolean | null>(null) // null = still checking
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title: '', category: 'Country Deck', country: '', description: '' })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/admin/ceo-knowledge-base')
      .then(async (r) => {
        if (!r.ok) {
          setVisible(false)
          return null
        }
        setVisible(true)
        return r.json()
      })
      .then((d) => setDocuments(d?.documents || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Render nothing until we know the viewer is CEO -- avoids a flash of
  // "Documents" heading for Admins while the check is in flight.
  if (!visible) return null

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!file) {
      setError('Choose an HTML or PDF file first')
      return
    }

    setUploading(true)
    const body = new FormData()
    body.append('file', file)
    body.append('title', form.title || file.name)
    body.append('category', form.category)
    body.append('country', form.country)
    body.append('description', form.description)

    const res = await fetch('/api/admin/ceo-knowledge-base', { method: 'POST', body })
    const data = await res.json()
    setUploading(false)

    if (!res.ok) {
      setError(data.error || 'Upload failed')
      return
    }

    setFile(null)
    setForm({ title: '', category: 'Country Deck', country: '', description: '' })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this document from the knowledge base?')) return
    const res = await fetch(`/api/admin/ceo-knowledge-base/${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  const grouped = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    acc[doc.category] = acc[doc.category] || []
    acc[doc.category].push(doc)
    return acc
  }, {})

  return (
    <div className="mt-10 space-y-8 border-t border-white/10 pt-8">
      <div>
        <h2 className="text-base font-semibold text-white">Documents</h2>
        <p className="mt-1 text-sm text-white/60">
          Visible to the CEO role only. Country presentation decks and visa guidebooks live here.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-white/40">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">No documents uploaded yet — add the first one below.</p>
        ) : (
          Object.entries(grouped).map(([category, docs]) => (
            <div key={category} className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/40">{category}</h3>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {docs.map((doc) => (
                  <article key={doc.id} className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
                    <h4 className="text-lg font-bold text-white">{doc.title}</h4>
                    {doc.country && <p className="mt-0.5 text-xs text-white/40">{doc.country}</p>}
                    {doc.description && <p className="mt-2 text-sm text-white/60">{doc.description}</p>}
                    <p className="mt-3 text-xs text-white/40">
                      {formatSize(doc.file_size)}
                      {doc.file_size && ' · '}
                      {new Date(doc.added_at).toLocaleDateString()}
                    </p>
                    <div className="mt-4 flex gap-3">
                      <a
                        href={`/api/admin/ceo-knowledge-base/${doc.id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="rounded-full px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-white">Add Document</h2>
        <form onSubmit={handleUpload} className="mt-4 max-w-xl space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">File (HTML or PDF, max 10 MB)</label>
            <input
              required
              type="file"
              accept=".html,.htm,application/pdf,text/html"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={file?.name ?? 'e.g. Study in Türkiye'}
              className={inputCls}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-white/60">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputCls}
              >
                <option value="Country Deck">Country Deck</option>
                <option value="Visa Guidebook">Visa Guidebook</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-white/60">Country</label>
              <input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="e.g. Portugal"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputCls}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={uploading}
            className="min-h-[44px] rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#0A3F3A] disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </div>
    </div>
  )
}
