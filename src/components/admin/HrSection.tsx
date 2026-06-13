'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { HrFlagsPanel } from '@/components/admin/HrFlagsPanel'
import { HrAttendancePanel } from '@/components/admin/HrAttendancePanel'
import { HrLeavePanel } from '@/components/admin/HrLeavePanel'
import { HrPoliciesPanel } from '@/components/admin/HrPoliciesPanel'
import { HrAnalyticsPanel } from '@/components/admin/HrAnalyticsPanel'

type Tab = 'flags' | 'attendance' | 'leave' | 'policies' | 'analytics'

const TABS: { id: Tab; label: string }[] = [
  { id: 'flags', label: 'Flags & Alerts' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave Management' },
  { id: 'policies', label: 'Policies & SOPs' },
  { id: 'analytics', label: 'HR Analytics' },
]

export function HrSection({ counselors }: { counselors: { id: string; name: string }[] }) {
  const [tab, setTab] = useState<Tab>('flags')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-blue md:text-3xl">HR</h1>
        <p className="mt-1 text-sm text-text/60">
          Staff management, attendance, leave, policies, and performance analytics
        </p>
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-text/10 bg-white p-1.5 w-fit max-w-full">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'min-h-[40px] whitespace-nowrap rounded-xl px-4 text-sm font-medium transition-colors',
              tab === t.id ? 'bg-text text-bg' : 'text-text/60 hover:bg-text/5'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'flags' && <HrFlagsPanel />}
        {tab === 'attendance' && <HrAttendancePanel counselors={counselors} />}
        {tab === 'leave' && <HrLeavePanel counselors={counselors} />}
        {tab === 'policies' && <HrPoliciesPanel />}
        {tab === 'analytics' && <HrAnalyticsPanel />}
      </div>
    </div>
  )
}
