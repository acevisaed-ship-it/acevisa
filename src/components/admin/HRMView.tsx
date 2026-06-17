'use client'

import { useEffect, useState } from 'react'
import { Users, DollarSign, TrendingUp } from 'lucide-react'

type CommissionRule = {
  counselorId: string
  counselorName: string
  commissionRate: number
  baseSalary: number
  dealsClosed: number
  totalDealValue: number
  commissionAmount: number
}

type FinanceSummary = {
  month: string
  commissions: CommissionRule[]
  expenseBreakdown: { category: string; label: string; amount: number }[]
  summary: { totalCollected: number; totalExpenses: number; net: number }
}

function formatPKR(n: number) {
  return `PKR ${n.toLocaleString('en-PK')}`
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function HRMView() {
  const [data, setData] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(currentMonth())

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/finance/summary?month=${month}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [month])

  const salaryExpenses = data?.expenseBreakdown.find((e) => e.category === 'salary')
  const totalSalaries = salaryExpenses?.amount ?? 0
  const totalCommissions = (data?.commissions ?? []).reduce((s, c) => s + c.commissionAmount, 0)
  const totalPayroll = totalSalaries + totalCommissions

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">HRM — Payroll</h1>
          <p className="mt-1 text-sm text-white/60">Salary and commission summary</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm outline-none glass-input"
        />
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl glass-card" />)}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">Base Salaries</p>
                <Users className="h-5 w-5 text-white/40" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{formatPKR(totalSalaries)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">Commissions</p>
                <TrendingUp className="h-5 w-5 text-green" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{formatPKR(totalCommissions)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">Total Payroll</p>
                <DollarSign className="h-5 w-5 text-orange" />
              </div>
              <p className="mt-2 text-2xl font-bold text-orange">{formatPKR(totalPayroll)}</p>
            </div>
          </div>

          <h2 className="mt-8 text-lg font-semibold text-white">Per Counselor</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 glass-card crisp-on-dark">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3">Counselor</th>
                  <th className="px-4 py-3">Commission Rate</th>
                  <th className="px-4 py-3">Deals Closed</th>
                  <th className="px-4 py-3">Deal Value</th>
                  <th className="px-4 py-3">Commission Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {(data?.commissions ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-white/40">
                      No commission data for this month
                    </td>
                  </tr>
                ) : (
                  (data?.commissions ?? []).map((c) => (
                    <tr key={c.counselorId} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-white/80">{c.counselorName}</td>
                      <td className="px-4 py-3 text-white/60">{c.commissionRate}%</td>
                      <td className="px-4 py-3 text-white/60">{c.dealsClosed}</td>
                      <td className="px-4 py-3 text-white/60">{formatPKR(c.totalDealValue)}</td>
                      <td className="px-4 py-3 font-semibold text-green">{formatPKR(c.commissionAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
