import { CheckCircle, CheckCircle2, Clock } from 'lucide-react'
import type { Document } from '@/types'
import { BriefCard } from './BriefCard'

const DOCUMENT_STATUS = {
  uploaded: { icon: CheckCircle, color: 'text-green', label: 'Uploaded' },
  verified: { icon: CheckCircle2, color: 'text-blue', label: 'Verified' },
  requested: { icon: Clock, color: 'text-orange', label: 'Requested' },
} as const

type Props = {
  documents: Document[]
}

export function DocumentsChecklistSection({ documents }: Props) {
  return (
    <BriefCard>
      <h2 className="mb-4 text-lg font-bold text-text">Documents Checklist</h2>
      {documents.length === 0 ? (
        <p className="text-sm text-text/60">No documents requested yet.</p>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const config = DOCUMENT_STATUS[doc.status] ?? DOCUMENT_STATUS.requested
            const Icon = config.icon
            return (
              <div key={doc.id} className="flex items-center gap-3">
                <Icon className={`h-5 w-5 shrink-0 ${config.color}`} />
                <span className="flex-1 text-sm font-medium text-text">
                  {doc.document_name}
                </span>
                <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </BriefCard>
  )
}
