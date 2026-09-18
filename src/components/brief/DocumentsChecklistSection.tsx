'use client'

import { useState } from 'react'
import { CheckCircle, CheckCircle2, Clock, Download, Loader2, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import type { Document } from '@/types'
import { BriefCard } from './BriefCard'

const DOCUMENT_STATUS = {
  uploaded: { icon: CheckCircle, color: 'text-green', label: 'Uploaded' },
  verified: { icon: CheckCircle2, color: 'text-blue', label: 'Verified' },
  requested: { icon: Clock, color: 'text-orange', label: 'Requested' },
} as const

// Common document names for quick-add
const QUICK_DOCS = [
  'Passport (bio page)',
  'IELTS / English test certificate',
  'Degree / Transcript',
  'Bank statement (6 months)',
  'Employment letter',
  'CV / Resume',
  'Photograph (passport size)',
  'National ID / CNIC',
]

function DownloadButton({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/download`)
      const data = await res.json()
      if (data.url) {
        const a = window.document.createElement('a')
        a.href = data.url
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.click()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Download file"
      className="flex items-center gap-1 rounded-full bg-blue/10 px-2.5 py-1 text-xs font-semibold text-blue hover:bg-blue/20 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
      View
    </button>
  )
}

type Props = {
  documents: Document[]
  clientId: string
}

export function DocumentsChecklistSection({ documents, clientId }: Props) {
  const [docs, setDocs] = useState<Document[]>(documents)
  const [showForm, setShowForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function requestDocument(name: string) {
    if (!name.trim()) return
    setRequesting(true)
    const res = await fetch('/api/documents/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, documentName: name.trim() }),
    })
    const data = await res.json()
    if (res.ok && data.document) {
      setDocs((prev) => [...prev, data.document as Document])
      setCustomName('')
      setShowForm(false)
    }
    setRequesting(false)
  }

  async function toggleVerified(doc: Document) {
    const nextStatus = doc.status === 'verified' ? 'uploaded' : 'verified'
    setBusyId(doc.id)
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    if (res.ok) {
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: nextStatus } : d)))
    }
    setBusyId(null)
  }

  async function removeDocument(doc: Document) {
    if (!window.confirm(`Remove "${doc.document_name}"? This can't be undone.`)) return
    setBusyId(doc.id)
    const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    }
    setBusyId(null)
  }

  return (
    <BriefCard>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Documents Checklist</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-full glass-card px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white"
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'Request document'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-white/10 glass-card p-4">
          <p className="mb-2 text-xs font-semibold text-white/50 uppercase tracking-wide">Quick add</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_DOCS.map((name) => (
              <button
                key={name}
                onClick={() => requestDocument(name)}
                disabled={requesting || docs.some((d) => d.document_name === name)}
                className="rounded-full border border-white/20 glass-card px-3 py-1 text-xs text-white/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {docs.some((d) => d.document_name === name) ? '✓ ' : ''}{name}
              </button>
            ))}
          </div>
          <p className="mb-1.5 text-xs font-semibold text-white/50 uppercase tracking-wide">Or type a custom name</p>
          <div className="flex gap-2">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && requestDocument(customName)}
              placeholder="e.g. Police clearance certificate"
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none glass-input"
            />
            <button
              onClick={() => requestDocument(customName)}
              disabled={requesting || !customName.trim()}
              className="rounded-full bg-grad-teal crisp-on-dark px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              {requesting ? '...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-sm text-white/50">No documents requested yet. Use &ldquo;Request document&rdquo; above to ask the client to upload files.</p>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const config = DOCUMENT_STATUS[doc.status] ?? DOCUMENT_STATUS.requested
            const Icon = config.icon
            const hasFile = doc.status === 'uploaded' || doc.status === 'verified'
            const busy = busyId === doc.id
            return (
              <div key={doc.id} className="flex items-center gap-3">
                <Icon className={`h-5 w-5 shrink-0 ${config.color}`} />
                <span className="flex-1 text-sm font-medium text-white/80">
                  {doc.document_name}
                </span>
                {hasFile && <DownloadButton documentId={doc.id} />}
                {hasFile && (
                  <button
                    onClick={() => toggleVerified(doc)}
                    disabled={busy}
                    title={doc.status === 'verified' ? 'Mark as not verified' : 'Mark as verified'}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                      doc.status === 'verified'
                        ? 'bg-blue/10 text-blue hover:bg-blue/20'
                        : 'bg-green/10 text-green hover:bg-green/20'
                    }`}
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                    {doc.status === 'verified' ? 'Verified' : 'Verify'}
                  </button>
                )}
                <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                <button
                  onClick={() => removeDocument(doc)}
                  disabled={busy}
                  title="Remove document"
                  className="text-white/30 hover:text-red-400 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </BriefCard>
  )
}
