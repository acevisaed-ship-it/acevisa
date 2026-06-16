'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2, FileText, Calendar, MessageSquare,
  AlertCircle, ArrowUpCircle, RefreshCw,
} from 'lucide-react'

type Update = {
  id: string
  action_type: string
  description: string
  created_at: string
  metadata?: Record<string, unknown>
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  document_uploaded:   FileText,
  document_verified:   CheckCircle2,
  stage_changed:       ArrowUpCircle,
  meeting_scheduled:   Calendar,
  note_shared:         MessageSquare,
  escalation_answered: CheckCircle2,
  complaint_resolved:  CheckCircle2,
  profile_updated:     RefreshCw,
}

const ACTION_COLORS: Record<string, string> = {
  document_uploaded:   'text-blue-300',
  document_verified:   'text-green-300',
  stage_changed:       'text-teal-300',
  meeting_scheduled:   'text-purple-300',
  note_shared:         'text-yellow-300',
  escalation_answered: 'text-green-300',
  complaint_resolved:  'text-green-300',
  profile_updated:     'text-white/60',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const glassPanel = {
  background: 'rgba(238,238,237,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
} as React.CSSProperties

type Props = {
  clientId: string
}

export function UpdatesFeed({ clientId }: Props) {
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) return
    fetch(`/api/chat/updates?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d) => setUpdates(d.updates ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [clientId])

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div className="rounded-2xl p-3" style={glassPanel}>
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-white/60" />
          <span className="text-sm font-semibold text-white">Updates</span>
        </div>

        {loading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {!loading && updates.length === 0 && (
          <p className="text-xs text-white/30">No updates yet. Your counselor&apos;s actions will appear here.</p>
        )}

        {!loading && updates.length > 0 && (
          <div className="flex flex-col">
            {updates.map((u, i) => {
              const Icon = ACTION_ICONS[u.action_type] ?? MessageSquare
              const color = ACTION_COLORS[u.action_type] ?? 'text-white/60'
              const isLast = i === updates.length - 1

              return (
                <div key={u.id} className="flex gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 ${color}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    {!isLast && <div className="mt-1 w-px flex-1 bg-white/10" />}
                  </div>

                  {/* Content */}
                  <div className={`pb-3 ${isLast ? '' : ''}`}>
                    <p className="text-[11px] leading-snug text-white/80">{u.description}</p>
                    <p className="mt-0.5 text-[10px] text-white/30">{timeAgo(u.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
