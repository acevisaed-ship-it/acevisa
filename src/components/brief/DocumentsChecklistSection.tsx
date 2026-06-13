'use client'

import { useState } from 'react'
import { CheckCircle, CheckCircle2, Clock, Download, Loader2, Plus, X } from 'lucide-react'
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

  return (
    <BriefCard>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text">Documents Checklist</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-text/10 px-3 py-1.5 text-xs font-semibold text-text hover:bg-text/20"
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'Request document'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-text/10 bg-bg p-4">
          <p className="mb-2 text-xs font-semibold text-text/60 uppercase tracking-wide">Quick add</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_DOCS.map((name) => (
              <button
                key={name}
                onClick={() => requestDocument(name)}
                disabled={requesting || docs.some((d) => d.document_name === name)}
                className="rounded-full border border-text/20 bg-white px-3 py-1 text-xs text-text hover:bg-text/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {docs.some((d) => d.document_name === name) ? '✓ ' : ''}{name}
              </button>
            ))}
          </div>
          <p className="mb-1.5 text-xs font-semibold text-text/60 uppercase tracking-wide">Or type a custom name</p>
          <div className="flex gap-2">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && requestDocument(customName)}
              placeholder="e.g. Police clearance certificate"
              className="flex-1 rounded-xl border border-text/20 bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
            />
            <button
              onClick={() => requestDocument(customName)}
              disabled={requesting || !customName.trim()}
              className="rounded-full bg-text px-4 py-2 text-xs font-semibold text-bg disabled:opacity-40"
            >
              {requesting ? '...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-sm text-text/60">No documents requested yet. Use "Request document" above to ask the client to upload files.</p>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const config = DOCUMENT_STATUS[doc.status] ?? DOCUMENT_STATUS.requested
            const Icon = config.icon
            const hasFile = doc.status === 'uploaded' || doc.status === 'verified'
            return (
              <div key={doc.id} className="flex items-center gap-3">
                <Icon className={`h-5 w-5 shrink-0 ${config.color}`} />
                <span className="flex-1 text-sm font-medium text-text">
                  {doc.document_name}
                </span>
                {hasFile && <DownloadButton documentId={doc.id} />}
                <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </BriefCard>
  )
}
