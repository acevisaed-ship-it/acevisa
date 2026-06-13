'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { formatPkr } from '@/lib/admin/dealTypes'
import { cn } from '@/lib/utils'

function downloadExport(type: string, month: string) {
  const a = document.createElement('a')
  a.href = `/api/admin/finance/export?type=${type}&month=${month}`
  a.download = ''
  document.body.appendChild(a)
  a.click()
  a.remove()
}

type Summary = {
  totalInvoiced: number
  totalCollected: number
  totalExpenses: number
  net: number
}

type IncomeRow = {
  invoiceNumber: string
  clientName: string
  amount: number
  paidAt: string
}

type ExpenseRow = {
  category: string
  label: string
  amount: number
}

type CommissionRow = {
  counselorId: string
  counselorName: string
  dealsClosed: number
  totalDealValue: number
  commissionRate: number
  commissionAmount: number
}

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function FinanceSummary() {
  const [month, setMonth] = useState(currentMonthValue)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [income, setIncome] = useState<IncomeRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [commissions, setCommissions] = useState<CommissionRow[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/finance/summary?month=${month}`)
      const data = await res.json()
      if (res.ok) {
        setSummary(data.summary)
        setIncome(data.incomeBreakdown ?? [])
        setExpenses(data.expenseBreakdown ?? [])
        setCommissions(data.commissions ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    loadData()
  }, [loadData])

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-PK', {
      month: 'long',
      year: 'numeric',
    })
  }, [month])

  const cards = [
    { label: 'Total Invoiced', value: summary?.totalInvoiced ?? 0 },
    { label: 'Total Collected', value: summary?.totalCollected ?? 0 },
    { label: 'Total Expenses', value: summary?.totalExpenses ?? 0 },
    { label: 'Net', value: summary?.net ?? 0, highlight: true },
  ]

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue md:text-3xl">P&amp;L Summary</h1>
          <p className="mt-1 text-sm text-text/60">{monthLabel}</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="min-h-[44px] rounded-full border border-text/20 bg-white px-4 text-sm text-text outline-none focus:border-blue"
        />
      </div>

      {/* Export buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { type: 'pl', label: 'P&L Summary' },
          { type: 'invoices', label: 'Client Invoices' },
          { type: 'expenses', label: 'Expenses' },
          { type: 'commissions', label: 'Commissions' },
        ].map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => downloadExport(type, month)}
            className="inline-flex items-center gap-1.5 rounded-full border border-text/20 bg-white px-4 py-2 text-xs font-medium text-text/70 hover:border-blue hover:text-blue transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-text/60">Loading finance data…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-text/10 bg-white p-5"
              >
                <p className="text-sm text-text/60">{card.label}</p>
                <p
                  className={cn(
                    'mt-2 text-2xl font-semibold',
                    card.highlight && (summary?.net ?? 0) < 0
                      ? 'text-orange'
                      : card.highlight
                        ? 'text-green'
                        : 'text-text'
                  )}
                >
                  {formatPkr(card.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-text/10 bg-white p-5">
              <h2 className="font-semibold text-text">Income — Paid Invoices</h2>
              {income.length === 0 ? (
                <p className="mt-4 text-sm text-text/60">No payments collected this month.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {income.map((row) => (
                    <li
                      key={row.invoiceNumber}
                      className="flex items-center justify-between border-b border-text/5 pb-3 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-text">{row.clientName}</p>
                        <p className="text-xs text-text/60">{row.invoiceNumber}</p>
                      </div>
                      <p className="text-sm font-semibold text-green">
                        {formatPkr(row.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-text/10 bg-white p-5">
              <h2 className="font-semibold text-text">Expenses by Category</h2>
              {expenses.length === 0 ? (
                <p className="mt-4 text-sm text-text/60">No expenses recorded this month.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {expenses.map((row) => (
                    <li
                      key={row.category}
                      className="flex items-center justify-between border-b border-text/5 pb-3 last:border-0"
                    >
                      <p className="text-sm font-medium text-text">{row.label}</p>
                      <p className="text-sm font-semibold text-orange">
                        {formatPkr(row.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="mt-8 rounded-2xl border border-text/10 bg-white p-5">
            <h2 className="font-semibold text-text">Counselor Commissions</h2>
            <p className="mt-1 text-xs text-text/60">
              Based on deals closed (agreement signed or completed) this month
            </p>
            {commissions.length === 0 ? (
              <p className="mt-4 text-sm text-text/60">No counselor data available.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-text/10 text-text/60">
                      <th className="px-2 py-2 font-medium">Counselor</th>
                      <th className="px-2 py-2 font-medium">Deals closed</th>
                      <th className="px-2 py-2 font-medium">Deal value</th>
                      <th className="px-2 py-2 font-medium">Rate</th>
                      <th className="px-2 py-2 font-medium">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((row) => (
                      <tr key={row.counselorId} className="border-b border-text/5 last:border-0">
                        <td className="px-2 py-3 font-medium text-text">
                          {row.counselorName}
                        </td>
                        <td className="px-2 py-3 text-text/70">{row.dealsClosed}</td>
                        <td className="px-2 py-3 text-text/70">
                          {formatPkr(row.totalDealValue)}
                        </td>
                        <td className="px-2 py-3 text-text/70">{row.commissionRate}%</td>
                        <td className="px-2 py-3 font-semibold text-blue">
                          {formatPkr(row.commissionAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}
