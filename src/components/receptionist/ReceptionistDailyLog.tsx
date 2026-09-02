'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getTodayPKTDateString, addDaysToDateString } from '@/lib/pkt'
import { DailyLogIcon } from '@/components/receptionist/icons'

type WalkIn = {
  id: string
  clientId: string
  clientName: string
  clientCode: string | null
  note: string | null
  loggedByName: string | null
  createdAt: string
}

type Registration = {
  id: string
  name: string
  clientCode: string
  phone: string
  interestedIn: string | null
  targetCountry: string | null
  registrationDate: string
  adSource: string | null
  counselorName: string | null
}

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export function ReceptionistDailyLog() {
  const todayStr = getTodayPKTDateString()
  const [date, setDate] = useState(todayStr)
  const [walkIns, setWalkIns] = useState<WalkIn[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(d: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/receptionist/daily-logs?date=${d}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to load daily log')
        return
      }
      setWalkIns(data.walkIns ?? [])
      setRegistrations(data.registrations ?? [])
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(date) }, [date])

  const isToday = date === todayStr

  return (
    <Card variant="blue" className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green/20 text-orange">
            <DailyLogIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-grad-orange">Daily logs</p>
            <p className="mt-0.5 text-xs text-green">
              Every office visit and every client registered, by day.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="border border-green/40 px-3 py-1.5 text-xs text-green hover:bg-green/10"
            onClick={() => setDate(addDaysToDateString(date, -1))}
          >
            ← Prev day
          </Button>
          <input
            type="date"
            value={date}
            max={todayStr}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-[38px] rounded-xl px-2 py-1 text-sm outline-none glass-input"
          />
          <Button
            type="button"
            variant="secondary"
            className="border border-green/40 px-3 py-1.5 text-xs text-green hover:bg-green/10 disabled:hover:bg-transparent"
            disabled={isToday}
            onClick={() => setDate(addDaysToDateString(date, 1))}
          >
            Next day →
          </Button>
          {!isToday && (
            <Button type="button" className="px-3 py-1.5 text-xs" onClick={() => setDate(todayStr)}>
              Today
            </Button>
          )}
        </div>
      </div>

      {loading && <p className="mt-4 text-sm text-green">Loading…</p>}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orange">
              Office visits ({walkIns.length})
            </p>
            {walkIns.length === 0 ? (
              <p className="mt-2 text-sm text-green">No walk-ins logged this day.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {walkIns.map((w) => (
                  <li key={w.id} className="rounded-lg border border-green/30 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-green">
                        {w.clientName}
                        {w.clientCode && <span className="text-orange"> · {w.clientCode}</span>}
                      </span>
                      <span className="text-xs text-orange">{timeOnly(w.createdAt)}</span>
                    </div>
                    {w.note && <p className="mt-0.5 text-xs text-green">{w.note}</p>}
                    {w.loggedByName && (
                      <p className="mt-0.5 text-xs text-orange">Logged by {w.loggedByName}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orange">
              New clients registered ({registrations.length})
            </p>
            {registrations.length === 0 ? (
              <p className="mt-2 text-sm text-green">No clients registered this day.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {registrations.map((r) => (
                  <li key={r.id} className="rounded-lg border border-green/30 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-green">
                        {r.name} <span className="text-orange">· {r.clientCode}</span>
                      </span>
                      <span className="text-xs text-orange">{timeOnly(r.registrationDate)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-green">
                      {r.interestedIn ?? '—'}
                      {r.targetCountry ? ` · ${r.targetCountry}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-orange">
                      {r.counselorName ? `Assigned to ${r.counselorName}` : 'Unassigned'}
                      {r.adSource ? ` · via ${r.adSource}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
