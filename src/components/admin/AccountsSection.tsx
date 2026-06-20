'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FinanceSummary } from '@/components/admin/FinanceSummary'
import { InvoiceManager } from '@/components/admin/InvoiceManager'
import { IncentivePolicyPanel } from '@/components/admin/IncentivePolicyPanel'
import { HRMView } from '@/components/admin/HRMView'

type Tab = 'pl' | 'invoices' | 'payroll' | 'incentive'

type ClientOption = { id: string; name: string; counselor_id: string | null }
type DealOption = { id: string; client_id: string; deal_value: number; service_type: string }
type CounselorOption = { id: string; name: string }

const TABS: { id: Tab; label: string }[] = [
  { id: 'invoices', label: 'Invoices & Expenses' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'pl', label: 'P&L Summary' },
  { id: 'incentive', label: 'Incentive Policy' },
]

export function AccountsSection({
  clients,
  deals,
  counselors,
}: {
  clients: ClientOption[]
  deals: DealOption[]
  counselors: CounselorOption[]
}) {
  const [tab, setTab] = useState<Tab>('invoices')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Accounts</h1>
        <p className="mt-1 text-sm text-white/60">Finance overview, invoices, and incentive structures</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl tab-container p-1.5 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'min-h-[40px] rounded-xl px-5 text-sm font-medium transition-colors',
              tab === t.id
                ? 'tab-btn-active'
                : 'tab-btn-inactive'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div>
        {tab === 'pl' && <FinanceSummary />}
        {tab === 'invoices' && <InvoiceManager clients={clients} deals={deals} />}
        {tab === 'payroll' && <HRMView />}
        {tab === 'incentive' && <IncentivePolicyPanel counselors={counselors} />}
      </div>
    </div>
  )
}
