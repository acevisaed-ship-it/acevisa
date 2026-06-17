'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatPkr } from '@/lib/admin/dealTypes'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

interface IncomeItem {
  id: string
  invoiceNumber: string
  clientName: string
  amount: number
  paidAt: string
}

interface ExpenseItem {
  id: string
  description: string
  subcategory: string | null
  amount: number
  paidAt: string
}

interface SubcategoryGroup {
  label: string
  total: number
  items: ExpenseItem[]
}

interface ExpenseCategoryGroup {
  category: string
  label: string
  total: number
  subcategories: Record<string, SubcategoryGroup>
  items: ExpenseItem[]
}

interface CommissionRow {
  counselorId: string
  counselorName: string
  dealsClosed: number
  totalDealValue: number
  commissionRate: number
  commissionAmount: number
}

interface FinanceData {
  period: { mode: string; label: string; start: string; end: string }
  summary: { totalCollected: number; totalExpenses: number; net: number; transactionCount: number; expenseCount: number }
  incomeItems: IncomeItem[]
  expenseCategories: ExpenseCategoryGroup[]
  commissions: CommissionRow[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatPKT(iso: string) {
  if (!iso) return '—'
  const pkt = new Date(new Date(iso).getTime() + 5 * 3600 * 1000)
  return pkt.toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' PKT'
}

function downloadExport(type: string, month: string) {
  const a = document.createElement('a')
  a.href = `/api/admin/finance/export?type=${type}&month=${month}`
  a.download = ''
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ItemRow({ label, amount, timestamp, indent = 0 }: {
  label: string; amount: number; timestamp: string; indent?: number
}) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-4 py-2.5 border-b border-white/5 last:border-0',
      indent === 1 && 'pl-4',
      indent === 2 && 'pl-8',
    )}>
      <div className="min-w-0">
        <p className="text-sm text-white/80 truncate">{label}</p>
        <p className="text-[11px] text-white/40 mt-0.5">{formatPKT(timestamp)}</p>
      </div>
      <p className={cn('text-sm font-semibold shrink-0', amount >= 0 ? 'text-orange' : 'text-green')}>
        {formatPkr(amount)}
      </p>
    </div>
  )
}

function CategoryBlock({ group }: { group: ExpenseCategoryGroup }) {
  const [open, setOpen] = useState(true)
  const hasSubcats = Object.keys(group.subcategories).length > 0

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Category header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 glass-card hover:brightness-125 transition-all"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
          <span className="text-sm font-semibold text-white/80">{group.label}</span>
          <span className="text-xs text-white/40">
            ({group.items.length + Object.values(group.subcategories).reduce((s, sc) => s + sc.items.length, 0)} entries)
          </span>
        </div>
        <span className="text-sm font-bold text-orange">{formatPkr(group.total)}</span>
      </button>

      {open && (
        <div className="px-4 pb-2">
          {/* Items with no subcategory */}
          {group.items.map((item) => (
            <ItemRow key={item.id} label={item.description} amount={item.amount} timestamp={item.paidAt} indent={1} />
          ))}

          {/* Subcategory groups */}
          {hasSubcats && Object.entries(group.subcategories).map(([subKey, sub]) => (
            <SubcategoryBlock key={subKey} sub={sub} />
          ))}
        </div>
      )}
    </div>
  )
}

function SubcategoryBlock({ sub }: { sub: SubcategoryGroup }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mt-2 rounded-lg border border-white/8 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 glass-card hover:brightness-125 transition-all"
      >
        <div className="flex items-center gap-1.5">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-white/30" /> : <ChevronRight className="h-3.5 w-3.5 text-white/30" />}
          <span className="text-xs font-semibold text-white/60">{sub.label}</span>
          <span className="text-[10px] text-white/30">({sub.items.length})</span>
        </div>
        <span className="text-xs font-semibold text-orange">{formatPkr(sub.total)}</span>
      </button>
      {open && (
        <div className="px-3 pb-1">
          {sub.items.map((item) => (
            <ItemRow key={item.id} label={item.description} amount={item.amount} timestamp={item.paidAt} indent={2} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const PERIOD_TABS: { id: PeriodMode; label: string }[] = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'yearly', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
]

export function FinanceSummary() {
  const [mode, setMode] = useState<PeriodMode>('monthly')
  const [customFrom, setCustomFrom] = useState(todayISO())
  const [customTo, setCustomTo] = useState(todayISO())
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  // Legacy month for the old export endpoint
  const [exportMonth] = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ mode })
    params.set('date', todayISO())
    if (mode === 'custom') {
      params.set('from', customFrom)
      params.set('to', customTo)
    }
    const res = await fetch(`/api/admin/finance/detail?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [mode, customFrom, customTo])

  useEffect(() => { fetchData() }, [fetchData])

  const summary = data?.summary
  const net = summary?.net ?? 0

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">P&amp;L Summary</h1>
          <p className="mt-1 text-sm text-white/60">{data?.period.label ?? '…'}</p>
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { type: 'pl', label: 'P&L' },
            { type: 'invoices', label: 'Invoices' },
            { type: 'expenses', label: 'Expenses' },
            { type: 'commissions', label: 'Commissions' },
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => downloadExport(type, exportMonth)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 glass-card px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors"
            >
              <Download className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Period tabs */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              mode === tab.id ? 'tab-btn-active' : 'tab-btn-inactive border border-white/15'
            )}
          >
            {tab.label}
          </button>
        ))}

        {mode === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 ml-1">
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="min-h-[38px] rounded-xl px-3 text-sm outline-none glass-input"
            />
            <span className="text-sm text-white/40">→</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
              className="min-h-[38px] rounded-xl px-3 text-sm outline-none glass-input"
            />
          </div>
        )}
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-white/50">Loading…</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Income Collected', value: summary?.totalCollected ?? 0, sub: `${summary?.transactionCount ?? 0} invoices`, color: 'text-green', icon: TrendingUp },
              { label: 'Total Expenses', value: summary?.totalExpenses ?? 0, sub: `${summary?.expenseCount ?? 0} entries`, color: 'text-orange', icon: TrendingDown },
              { label: 'Net P&L', value: net, sub: net >= 0 ? 'Profit' : 'Loss', color: net >= 0 ? 'text-green' : 'text-orange', icon: net >= 0 ? TrendingUp : TrendingDown },
              { label: 'Margin', value: null, sub: summary?.totalCollected ? `${Math.round((net / summary.totalCollected) * 100)}%` : '—', color: 'text-white', icon: Minus },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white/50 uppercase tracking-wide">{card.label}</p>
                  <card.icon className={cn('h-4 w-4', card.color)} />
                </div>
                {card.value !== null ? (
                  <p className={cn('mt-2 text-xl font-bold', card.color)}>{formatPkr(card.value)}</p>
                ) : (
                  <p className={cn('mt-2 text-3xl font-bold', card.color)}>{card.sub}</p>
                )}
                {card.value !== null && (
                  <p className="mt-1 text-xs text-white/40">{card.sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* Income section */}
          <section className="mt-8 rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">Income — Payments Received</h2>
                <p className="text-xs text-white/40 mt-0.5">{data?.incomeItems.length ?? 0} invoices in this period</p>
              </div>
              <span className="text-base font-bold text-green">{formatPkr(summary?.totalCollected ?? 0)}</span>
            </div>

            {(data?.incomeItems.length ?? 0) === 0 ? (
              <p className="text-sm text-white/50 py-4">No payments collected in this period.</p>
            ) : (
              <div>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-[10px] font-semibold uppercase tracking-wider text-white/40 px-2 pb-2 border-b border-white/10">
                  <span>Client / Invoice</span>
                  <span className="text-right">Date & Time (PKT)</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="divide-y divide-white/5">
                  {data?.incomeItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-2 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{item.clientName}</p>
                        <p className="text-[11px] text-white/40">{item.invoiceNumber}</p>
                      </div>
                      <p className="text-xs text-white/50 whitespace-nowrap">{formatPKT(item.paidAt)}</p>
                      <p className="text-sm font-semibold text-green whitespace-nowrap">{formatPkr(item.amount)}</p>
                    </div>
                  ))}
                </div>
                {/* Income total */}
                <div className="flex justify-end pt-3 border-t border-white/10 mt-2">
                  <p className="text-sm font-bold text-green">Total: {formatPkr(summary?.totalCollected ?? 0)}</p>
                </div>
              </div>
            )}
          </section>

          {/* Expenses section */}
          <section className="mt-6 rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">Expenses by Category</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {data?.expenseCategories.length ?? 0} categories · {summary?.expenseCount ?? 0} entries
                </p>
              </div>
              <span className="text-base font-bold text-orange">{formatPkr(summary?.totalExpenses ?? 0)}</span>
            </div>

            {(data?.expenseCategories.length ?? 0) === 0 ? (
              <p className="text-sm text-white/50 py-4">No expenses recorded in this period.</p>
            ) : (
              <div className="space-y-3">
                {data?.expenseCategories.map((group) => (
                  <CategoryBlock key={group.category} group={group} />
                ))}
                {/* Expenses total */}
                <div className="flex justify-end pt-2 border-t border-white/10">
                  <p className="text-sm font-bold text-orange">Total: {formatPkr(summary?.totalExpenses ?? 0)}</p>
                </div>
              </div>
            )}
          </section>

          {/* Commissions */}
          {(data?.commissions.length ?? 0) > 0 && (
            <section className="mt-6 rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
              <h2 className="font-semibold text-white">Counselor Commissions</h2>
              <p className="mt-1 text-xs text-white/50">
                Based on deals closed in this period (agreement signed or completed)
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                      <th className="px-2 py-2 font-medium">Counselor</th>
                      <th className="px-2 py-2 font-medium">Deals closed</th>
                      <th className="px-2 py-2 font-medium">Deal value</th>
                      <th className="px-2 py-2 font-medium">Rate</th>
                      <th className="px-2 py-2 font-medium">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.commissions.filter(r => r.dealsClosed > 0).map((row) => (
                      <tr key={row.counselorId} className="border-b border-white/5 last:border-0">
                        <td className="px-2 py-3 font-medium text-white/80">{row.counselorName}</td>
                        <td className="px-2 py-3 text-white/60">{row.dealsClosed}</td>
                        <td className="px-2 py-3 text-white/60">{formatPkr(row.totalDealValue)}</td>
                        <td className="px-2 py-3 text-white/60">{row.commissionRate}%</td>
                        <td className="px-2 py-3 font-semibold text-green">{formatPkr(row.commissionAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}
