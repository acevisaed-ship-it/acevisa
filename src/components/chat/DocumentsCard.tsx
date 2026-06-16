'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, FileText, CheckCircle2, Clock, Upload, ExternalLink } from 'lucide-react'

type Doc = {
  id: string
  document_name: string
  status: 'requested' | 'uploaded' | 'verified'
  file_url: string | null
  updated_at: string
}

type Props = { clientId: string }

const glassPanel = {
  background: 'rgba(238,238,237,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
} as React.CSSProperties

const STATUS_CONFIG = {
  requested: { label: 'Pending',  color: 'text-orange bg-orange/10', Icon: Clock },
  uploaded:  { label: 'Uploaded', color: 'text-blue bg-blue/10',    Icon: Upload },
  verified:  { label: 'Verified', color: 'text-green-300 bg-green-400/10', Icon: CheckCircle2 },
}

export function DocumentsCard({ clientId }: Props) {
  const [open, setOpen]       = useState(true)
  const [docs, setDocs]       = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/chat/documents?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .finally(() => setLoading(false))
  }, [clientId])

  const pending  = docs.filter((d) => d.status === 'requested').length
  const verified = docs.filter((d) => d.status === 'verified').length

  return (
    <div className="rounded-2xl p-3" style={glassPanel}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-white/60" />
          <span className="text-sm font-semibold text-white">My Documents</span>
          {pending > 0 && (
            <span className="rounded-full bg-orange/20 px-1.5 py-0.5 text-[10px] font-bold text-orange">
              {pending} pending
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-1.5">
          {loading && (
            <>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" />
              ))}
            </>
          )}

          {!loading && docs.length === 0 && (
            <p className="text-xs text-white/40">No documents yet.</p>
          )}

          {!loading && docs.map((doc) => {
            const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.requested
            const StatusIcon = cfg.Icon
            return (
              <div key={doc.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${cfg.color.split(' ')[0]}`} />
                <span className="min-w-0 flex-1 truncate text-[11px] text-white/80">{doc.document_name}</span>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${cfg.color}`}>
                  {cfg.label}
                </span>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-white/30 hover:text-white/70">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )
          })}

          {!loading && docs.length > 0 && (
            <p className="mt-1 text-[10px] text-white/30">
              {verified} of {docs.length} verified
            </p>
          )}
        </div>
      )}
    </div>
  )
}
