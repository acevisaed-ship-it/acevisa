'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, GraduationCap } from 'lucide-react'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS, type ApplicationStatus } from '@/lib/applications'

type Update = { id: string; status: string | null; note: string | null; created_at: string }
type Application = {
  id: string
  institution_name: string
  program_name: string | null
  country: string | null
  status: string
  updates: Update[]
}

const glassPanel = {
  background: 'rgba(238,238,237,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
} as React.CSSProperties

export function ApplicationsListCard({ clientId }: { clientId: string }) {
  const [applications, setApplications] = useState<Application[]>([])
  const [open, setOpen] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/applications?clientId=${clientId}`)
      .then((res) => res.json())
      .then((data) => setApplications(data.applications ?? []))
      .catch(() => {})
  }, [clientId])

  if (applications.length === 0) return null

  return (
    <div className="rounded-2xl p-3" style={glassPanel}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-white/60" />
          <span className="text-sm font-semibold text-white">My Applications</span>
          <span className="rounded-full bg-blue/20 px-1.5 py-0.5 text-[10px] font-bold text-blue">
            {applications.length}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {applications.map((app) => {
            const status = app.status as ApplicationStatus
            const label = APPLICATION_STATUS_LABELS[status] ?? app.status
            const color = APPLICATION_STATUS_COLORS[status] ?? '#2083B9'
            const isExpanded = expandedId === app.id
            return (
              <div key={app.id} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : app.id)} className="flex w-full items-center justify-between text-left">
                  <div>
                    <p className="text-xs font-semibold text-white">{app.institution_name}</p>
                    {app.program_name && <p className="text-[11px] text-white/50">{app.program_name}</p>}
                  </div>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${color}26`, color }}>
                    {label}
                  </span>
                </button>
                {isExpanded && app.updates.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                    {app.updates.map((u) => (
                      <p key={u.id} className="text-[11px] text-white/50">
                        {new Date(u.created_at).toLocaleDateString()} —{' '}
                        {u.note || (u.status ? `Status: ${APPLICATION_STATUS_LABELS[u.status as ApplicationStatus] ?? u.status}` : '')}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
