'use client'

import { useState } from 'react'

const PERIODS: { value: 'day' | 'week' | 'month' | 'all'; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All-time' },
]

export function SendReportCard() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('day')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleSend() {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/counselor/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setResult({ ok: true, message: `Sent to ${data.recipients?.length ?? 0} recipient(s).` })
      } else {
        setResult({ ok: false, message: data.error || 'Failed to send report' })
      }
    } catch {
      setResult({ ok: false, message: 'Failed to send report' })
    } finally {
      setSending(false)
      setTimeout(() => setResult(null), 5000)
    }
  }

  return (
    <section className="mb-10 rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
      <h2 className="mb-1 text-base font-bold text-white">Send progress report</h2>
      <p className="mb-4 text-xs text-white/50">
        Emails your clients, tasks, meetings and attendance summary to your branch admin and the
        CEO.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                period === p.value
                  ? 'bg-orange text-text'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={sending}
          onClick={handleSend}
          className="ml-auto min-h-[40px] rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send report'}
        </button>
      </div>
      {result && (
        <p className={`mt-3 text-xs ${result.ok ? 'text-green' : 'text-red-300'}`}>
          {result.message}
        </p>
      )}
    </section>
  )
}
