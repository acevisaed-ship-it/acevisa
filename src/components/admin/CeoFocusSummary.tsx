import Link from 'next/link'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { CeoFocusSummary as CeoFocusSummaryData } from '@/lib/admin/getCeoFocusSummary'

export function CeoFocusSummary({ summary }: { summary: CeoFocusSummaryData }) {
  const { agentEnabled, items, totalOpen } = summary

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Needs your attention</h2>
        <p className="text-xs text-white/40">
          Pulled live from every queue you own — not just what the CEO Agent has drafted.
        </p>
      </div>

      {!agentEnabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-orange/30 bg-orange/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
          <p className="text-sm text-white/80">
            <span className="font-semibold">CEO Agent daily review is currently OFF.</span> That
            single automated rule (flagging counselors who&apos;ve closed zero deals and are high
            retention risk) won&apos;t run at all while it&apos;s off — flip the toggle below to
            turn it on. Everything else on this page is live regardless.
          </p>
        </div>
      )}

      {totalOpen === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 glass-card crisp-on-dark p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green" />
          <p className="text-sm text-white/70">
            Nothing waiting across any queue right now — pending requests, escalations, negligence
            flags, unassigned clients, and today&apos;s attendance are all clear.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col gap-1 rounded-2xl border p-4 transition-colors ${
                item.count > 0
                  ? 'border-orange/30 glass-card crisp-on-dark hover:border-orange/50'
                  : 'border-white/10 glass-card crisp-on-dark opacity-50 hover:opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <span
                  className={`flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    item.count > 0 ? 'bg-orange text-white' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {item.count}
                </span>
              </div>
              <p className="text-xs text-white/40">{item.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
