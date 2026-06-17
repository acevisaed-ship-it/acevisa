'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatPkr } from '@/lib/admin/dealTypes'
import { cn } from '@/lib/utils'

type CounselorAnalytics = {
  counselorId: string
  counselorName: string
  status: string
  baseSalary: number
  commissionRate: number
  commissionEarned: number
  totalCost: number
  dealCount: number
  revenueGenerated: number
  businessContributionPct: number
  netContribution: number
  roi: number
  presentDays: number
  absentDays: number
  leaveDays: number
  joinedMonthsAgo: number
  retentionRisk: 'low' | 'medium' | 'high'
}

function riskColor(risk: string) {
  if (risk === 'high') return 'bg-red-500/20 text-red-400'
  if (risk === 'medium') return 'bg-orange/15 text-orange'
  return 'bg-green/20 text-white'
}

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function HrAnalyticsPanel() {
  const [month, setMonth] = useState(currentMonthValue)
  const [data, setData] = useState<{
    totalRevenue: number
    totalCost: number
    counselors: CounselorAnalytics[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/hr/analytics?month=${month}`)
      const json = await res.json()
      if (res.ok) setData(json)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })
  }, [month])

  if (loading) return <p className="text-sm text-white/50">Loading HR analytics…</p>

  if (!data) return <p className="text-sm text-white/50">Failed to load analytics.</p>

  const { counselors, totalRevenue, totalCost } = data
  const businessValuation = totalRevenue > 0 ? Math.round((totalRevenue / Math.max(totalCost, 1)) * 100) / 100 : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-white/50 font-medium">{monthLabel}</p>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="min-h-[44px] rounded-full px-4 text-sm outline-none glass-input"
        />
      </div>

      {/* Business overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-4">
          <p className="text-xs text-white/50">Total Revenue</p>
          <p className="text-xl font-bold text-white mt-1">{formatPkr(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-4">
          <p className="text-xs text-white/50">Total Staff Cost</p>
          <p className="text-xl font-bold text-orange mt-1">{formatPkr(totalCost)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-4">
          <p className="text-xs text-white/50">Net Profit After Staff</p>
          <p className={cn('text-xl font-bold mt-1', totalRevenue - totalCost >= 0 ? 'text-white' : 'text-red-400')}>
            {formatPkr(totalRevenue - totalCost)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-4">
          <p className="text-xs text-white/50">Revenue/Cost Ratio</p>
          <p className="text-xl font-bold text-white mt-1">{businessValuation}x</p>
        </div>
      </div>

      {/* Per-counselor cards */}
      {counselors.length === 0 ? (
        <p className="text-sm text-white/50">No counselors found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {counselors.map((c) => (
            <article key={c.counselorId} className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-white/80">{c.counselorName}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{c.joinedMonthsAgo}mo tenure</p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', riskColor(c.retentionRisk))}>
                  {c.retentionRisk} risk
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-white/50 text-xs">Deals Closed</p>
                  <p className="font-semibold text-white/80">{c.dealCount}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Revenue Generated</p>
                  <p className="font-semibold text-green">{formatPkr(c.revenueGenerated)}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Base Salary</p>
                  <p className="font-semibold text-white/80">{formatPkr(c.baseSalary)}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Commission ({c.commissionRate}%)</p>
                  <p className="font-semibold text-white/80">{formatPkr(c.commissionEarned)}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Total Cost</p>
                  <p className="font-semibold text-orange">{formatPkr(c.totalCost)}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Net Contribution</p>
                  <p className={cn('font-semibold', c.netContribution >= 0 ? 'text-white/80' : 'text-red-400')}>
                    {formatPkr(c.netContribution)}
                  </p>
                </div>
              </div>

              {/* Business contribution bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white/50">Business contribution</span>
                  <span className="font-bold text-green">{c.businessContributionPct}%</span>
                </div>
                <div className="h-2 rounded-full glass-card overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green transition-all"
                    style={{ width: `${Math.min(c.businessContributionPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* ROI */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-white/50">Return on staff investment</span>
                <span className={cn('font-bold', c.roi >= 100 ? 'text-white' : 'text-red-400')}>{c.roi}%</span>
              </div>

              {/* Attendance summary */}
              {(c.presentDays + c.absentDays + c.leaveDays > 0) && (
                <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-xs text-center">
                  <div>
                    <p className="text-white/40">Present</p>
                    <p className="font-semibold text-white/80">{c.presentDays}</p>
                  </div>
                  <div>
                    <p className="text-white/40">Absent</p>
                    <p className="font-semibold text-red-400">{c.absentDays}</p>
                  </div>
                  <div>
                    <p className="text-white/40">On Leave</p>
                    <p className="font-semibold text-white/60">{c.leaveDays}</p>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
