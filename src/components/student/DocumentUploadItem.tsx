'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Clock, Upload, Loader2 } from 'lucide-react'
import type { Document, DocumentStatus } from '@/types'

type Props = {
  doc: Document
  clientId: string
}

function statusIcon(status: DocumentStatus) {
  switch (status) {
    case 'requested': return <Clock size={18} className="text-[#E48328]" />
    case 'uploaded':  return <Upload size={18} className="text-[#2083B9]" />
    case 'verified':  return <CheckCircle2 size={18} className="text-[#B7C733]" />
  }
}

function statusLabel(status: DocumentStatus) {
  switch (status) {
    case 'requested': return 'Requested'
    case 'uploaded':  return 'Uploaded'
    case 'verified':  return 'Verified'
  }
}

export function DocumentUploadItem({ doc, clientId }: Props) {
  const [status, setStatus] = useState<DocumentStatus>(doc.status)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentId', doc.id)
    formData.append('clientId', clientId)

    const res = await fetch('/api/documents/upload', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Upload failed')
    } else {
      setStatus('uploaded')
    }
    setUploading(false)
    // Reset input so the same file can be re-uploaded if needed
    if (inputRef.current) inputRef.current.value = ''
  }

  const canUpload = status !== 'verified'

  return (
    <li className="rounded-2xl border border-[#0A3F3A]/10 bg-white/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {statusIcon(status)}
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#0A3F3A]">{doc.document_name}</p>
            <p className="text-sm capitalize text-[#0A3F3A]/60">{statusLabel(status)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'uploaded' && (
            <span className="text-xs text-[#0A3F3A]/40">Re-upload to replace</span>
          )}
          {canUpload && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFile}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex min-h-[40px] items-center gap-2 rounded-full bg-[#0A3F3A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                ) : (
                  <><Upload className="h-4 w-4" /> Upload</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </li>
  )
}
