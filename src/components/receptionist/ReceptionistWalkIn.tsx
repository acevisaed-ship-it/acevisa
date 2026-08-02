'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type SearchResult = { id: string; name: string; clientCode: string; counselorName: string }
type WalkIn = { id: string; clientId: string; clientName: string; note: string | null; createdAt: string }

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export function ReceptionistWalkIn() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [note, setNote] = useState('')
  const [logging, setLogging] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [todayList, setTodayList] = useState<WalkIn[]>([])

  async function loadToday() {
    const res = await fetch('/api/receptionist/walk-ins')
    const data = await res.json()
    if (res.ok) setTodayList(data.walkIns ?? [])
  }

  useEffect(() => { loadToday() }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/receptionist/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  async function handleLog(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    setLogging(true)
    setMessage(null)
    try {
      const res = await fetch('/api/receptionist/walk-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selected.id, note }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to log walk-in' })
        return
      }
      setMessage({ type: 'success', text: `Walk-in logged for ${selected.name}` })
      setSelected(null)
      setQuery('')
      setResults([])
      setNote('')
      loadToday()
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again' })
    } finally {
      setLogging(false)
    }
  }

  return (
    <Card variant="dark" className="p-5">
      <p className="text-sm font-medium text-bg/70">Record a walk-in</p>
      <p className="mt-1 text-xs text-bg/50">
        Every client visit — new or already registered — should be logged here.
      </p>

      {!selected ? (
        <div className="relative mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or AV-code"
            className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
          />
          {searching && <p className="mt-1 text-xs text-bg/40">Searching…</p>}
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-bg/10 rounded-xl border border-bg/10">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => { setSelected(r); setResults([]); setQuery('') }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg/5"
                  >
                    <span>
                      <span className="font-semibold">{r.name}</span>{' '}
                      <span className="text-bg/40">· {r.clientCode}</span>
                    </span>
                    <span className="text-xs text-bg/40">{r.counselorName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form onSubmit={handleLog} className="mt-3 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-bg/10 px-3 py-2">
            <span className="text-sm">
              <span className="font-semibold">{selected.name}</span>{' '}
              <span className="text-bg/40">· {selected.clientCode}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-bg/40 hover:text-bg/70"
            >
              Change
            </button>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (optional) — e.g. document drop-off, payment"
            className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
          />
          <Button type="submit" disabled={logging}>
            {logging ? 'Logging…' : 'Log walk-in'}
          </Button>
        </form>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message.text}
        </p>
      )}

      {todayList.length > 0 && (
        <div className="mt-5 border-t border-bg/10 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-bg/40">
            Today&apos;s walk-ins ({todayList.length})
          </p>
          <ul className="mt-2 space-y-1.5">
            {todayList.map((w) => (
              <li key={w.id} className="flex items-center justify-between text-sm">
                <span>
                  {w.clientName}
                  {w.note && <span className="text-bg/40"> — {w.note}</span>}
                </span>
                <span className="text-xs text-bg/40">{timeOnly(w.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
