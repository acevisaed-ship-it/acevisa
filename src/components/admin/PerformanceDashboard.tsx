'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatPkr } from '@/lib/admin/dealTypes'

type CounselorPerformance = {
  counselorId: string
  counselorName: string
  activeClients: number
  meetingsThisMonth: number
  avgResponseTimeSeconds: number | null
  openTasks: number
  negligenceFlags: number
  conversionRate: number
  needsAttention: boolean
  lateDays: number
  absenceDays: number
  baseSalary: number
  commissionEarned: number
  totalCost: number
  revenueGenerated: number
  businessContributionPct: number
  dealsClosed: number
}

type SortKey = 'conversionRate' | 'avgResponseTimeSeconds' | 'activeClients'

function formatResponseTime(seconds: number | null) {
  if (seconds === null) return '—'
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`
  return `${(seconds / 86400).toFixed(1)}d`
}

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function PerformanceDashboard() {
  const [month, setMonth] = useState(currentMonthValue)
  const [sortBy, setSortBy] = useState<SortKey>('conversionRate')
  const [counselors, setCounselors] = useState<CounselorPerformance[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/performance?month=${month}`)
      const data = await res.json()
      if (res.ok) setCounselors(data.counselors ?? [])
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    loadData()
  }, [loadData])

  const sorted = useMemo(() => {
    const list = [...counselors]
    list.sort((a, b) => {
      if (sortBy === 'conversionRate') return b.conversionRate - a.conversionRate
      if (sortBy === 'activeClients') return b.activeClients - a.activeClients
      const aVal = a.avgResponseTimeSeconds ?? Infinity
      const bVal = b.avgResponseTimeSeconds ?? Infinity
      return aVal - bVal
    })
    return list
  }, [counselors, sortBy])

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-PK', {
      month: 'long',
      year: 'numeric',
    })
  }, [month])

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Team Performance</h1>
          <p className="mt-1 text-sm text-white/60">{monthLabel}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="min-h-[44px] w-full rounded-full px-4 text-sm outline-none glass-input sm:w-auto"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="min-h-[44px] w-full rounded-full px-4 text-sm outline-none glass-input sm:w-auto"
          >
            <option value="conversionRate">Sort: Conversion rate</option>
            <option value="avgResponseTimeSeconds">Sort: Response time</option>
            <option value="activeClients">Sort: Active clients</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-white/50">Loading performance data…</p>
      ) : sorted.length === 0 ? (
        <p className="mt-8 text-white/50">No counselor data for this month.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((c) => (
            <article
              key={c.counselorId}
              className="relative rounded-2xl border border-white/10 glass-card crisp-on-dark p-5"
            >
              {c.needsAttention && (
                <span className="absolute right-4 top-4 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-400">
                  Needs Attention
                </span>
              )}
              <h2 className="pr-28 text-lg font-bold text-white">{c.counselorName}</h2>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-white/50">Active clients</dt>
                  <dd className="font-semibold text-white">{c.activeClients}</dd>
                </div>
                <div>
                  <dt className="text-white/50">Deals closed</dt>
                  <dd className="font-semibold text-white">{c.dealsClosed}</dd>
                </div>
                <div>
                  <dt className="text-white/50">Meetings</dt>
                  <dd className="font-semibold text-white">{c.meetingsThisMonth}</dd>
                </div>
                <div>
                  <dt className="text-white/50">Avg response</dt>
                  <dd className="font-semibold text-white">
                    {formatResponseTime(c.avgResponseTimeSeconds)}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/50">Open tasks</dt>
                  <dd className="font-semibold text-white">{c.openTasks}</dd>
                </div>
                <div>
                  <dt className="text-white/50">Negligence flags</dt>
                  <dd
                    className={cn(
                      'font-semibold',
                      c.negligenceFlags > 0 ? 'text-red-400' : 'text-white'
                    )}
                  >
                    {c.negligenceFlags}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/50">Late arrivals</dt>
                  <dd className={cn('font-semibold', c.lateDays > 0 ? 'text-orange' : 'text-white')}>
                    {c.lateDays}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/50">Absences</dt>
                  <dd className={cn('font-semibold', c.absenceDays > 0 ? 'text-red-400' : 'text-white')}>
                    {c.absenceDays}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/50">Conversion</dt>
                  <dd className="font-semibold text-green">{c.conversionRate}%</dd>
                </div>
                <div>
                  <dt className="text-white/50">Business share</dt>
                  <dd className="font-semibold text-green">{c.businessContributionPct}%</dd>
                </div>
              </dl>

              {/* Cost vs contribution */}
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-white/50 text-xs">Revenue generated</dt>
                  <dd className="font-bold text-white mt-0.5">{formatPkr(c.revenueGenerated)}</dd>
                </div>
                <div>
                  <dt className="text-white/50 text-xs">Total staff cost</dt>
                  <dd className="font-bold text-orange mt-0.5">{formatPkr(c.totalCost)}</dd>
                </div>
              </div>
              <div className="mt-2 text-xs text-white/30">
                Base {formatPkr(c.baseSalary)} + Commission {formatPkr(c.commissionEarned)}
              </div>

              {/* Contribution bar */}
              {c.businessContributionPct > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full glass-card overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green transition-all"
                      style={{ width: `${Math.min(c.businessContributionPct, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  )
}
