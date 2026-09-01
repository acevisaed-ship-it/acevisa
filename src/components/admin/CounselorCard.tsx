'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Phone, ArrowRight, Clock, ClipboardList } from 'lucide-react'
import { AssignTaskButton } from '@/components/admin/AssignTaskButton'

function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

type Metrics = {
  openCount: number
  inProgressCount: number
  remainingTodayCount: number
  completedTodayCount: number
  closedTodayCount: number
  portalActiveMinutes: number
}

// Whole card is clickable -> that counselor's activity log, so it doesn't
// need to be found or explained per counselor — this is what "click a
// counselor card" opens. The two existing actions (View Dashboard, Assign
// Task) stay as their own controls and stop the click from bubbling up to
// the card, so they still do their own thing instead of also navigating.
export function CounselorCard({
  counselor,
  metrics,
}: {
  counselor: {
    id: string
    name: string
    email: string
    phone: string | null
    clientCount: number
    openTaskCount: number
  }
  metrics: Metrics | undefined
}) {
  const router = useRouter()

  return (
    <article
      onClick={() => router.push(`/admin/team/${counselor.id}/activity`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/admin/team/${counselor.id}/activity`)
        }
      }}
      className="flex cursor-pointer flex-col rounded-2xl border border-white/10 glass-card crisp-on-dark p-5 transition-colors hover:border-white/25"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-white">{counselor.name}</h3>
        <span className="flex items-center gap-1 text-[11px] font-medium text-white/35">
          <ClipboardList className="h-3.5 w-3.5" />
          Activity log
        </span>
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-white/60">
        <p className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-white/40" />
          {counselor.email}
        </p>
        {counselor.phone && (
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-white/40" />
            {counselor.phone}
          </p>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-white/70">
        {counselor.clientCount} client{counselor.clientCount === 1 ? '' : 's'}
        <span className="mx-2 text-white/20">|</span>
        {counselor.openTaskCount} open task{counselor.openTaskCount === 1 ? '' : 's'}
      </p>

      {metrics && (
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl glass-card-md px-3 py-2.5 text-center">
          <div>
            <p className="text-sm font-bold text-white">{metrics.openCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/40">Open</p>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{metrics.inProgressCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/40">In Progress</p>
          </div>
          <div>
            <p className={`text-sm font-bold ${metrics.remainingTodayCount > 0 ? 'text-yellow-400' : 'text-white'}`}>
              {metrics.remainingTodayCount}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-white/40">Remaining Today</p>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{metrics.completedTodayCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/40">Done Today</p>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{metrics.closedTodayCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/40">Closed Today</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 text-sm font-bold text-white">
              <Clock className="h-3 w-3 text-white/40" />
              {formatMinutes(metrics.portalActiveMinutes)}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-white/40">Time Today</p>
          </div>
        </div>
      )}

      <Link
        href={`/admin/counselors/${counselor.id}/dashboard`}
        onClick={(e) => e.stopPropagation()}
        className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-grad-blue crisp-on-dark px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        View Dashboard
        <ArrowRight className="h-4 w-4" />
      </Link>
      <div onClick={(e) => e.stopPropagation()}>
        <AssignTaskButton targetId={counselor.id} targetName={counselor.name} />
      </div>
    </article>
  )
}
