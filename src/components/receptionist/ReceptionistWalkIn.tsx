'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { WalkInIcon } from '@/components/receptionist/icons'

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
    <div className="neo-card-green rounded-card p-5 transition-shadow duration-200">
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl neo-badge-green text-blue">
          <WalkInIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-grad-teal">Record a walk-in</p>
          <p className="mt-0.5 text-xs text-blue">
            Every client visit — new or already registered — should be logged here.
          </p>
        </div>
      </div>

      {!selected ? (
        <div className="relative mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or AV-code"
            className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm neo-inset-green"
          />
          {searching && <p className="mt-1 text-xs text-blue/80">Searching…</p>}
          {results.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => { setSelected(r); setResults([]); setQuery('') }}
                    className="neo-chip-green flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-shadow duration-150 hover:brightness-[0.98]"
                  >
                    <span>
                      <span className="font-semibold text-text">{r.name}</span>{' '}
                      <span className="text-blue">· {r.clientCode}</span>
                    </span>
                    <span className="text-xs text-blue">{r.counselorName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form onSubmit={handleLog} className="mt-3 space-y-3">
          <div className="neo-inset-green flex items-center justify-between rounded-xl px-3 py-2">
            <span className="text-sm">
              <span className="font-semibold text-text">{selected.name}</span>{' '}
              <span className="text-blue">· {selected.clientCode}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-blue hover:text-text"
            >
              Change
            </button>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (optional) — e.g. document drop-off, payment"
            className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm neo-inset-green"
          />
          <button
            type="submit"
            disabled={logging}
            className="neo-btn-green min-h-[44px] w-full rounded-full px-6 py-3 text-sm font-medium text-blue disabled:cursor-not-allowed"
          >
            {logging ? 'Logging…' : 'Log walk-in'}
          </button>
        </form>
      )}

      {message && (
        <p className={`mt-3 text-sm font-medium ${message.type === 'error' ? 'text-red-700' : 'text-text'}`}>
          {message.type === 'success' ? '✓ ' : ''}
          {message.text}
        </p>
      )}

      {todayList.length > 0 && (
        <div className="mt-5 pt-4" style={{ boxShadow: 'inset 0 1px 0 rgba(10,63,58,0.12)' }}>
          <p className="text-xs font-medium uppercase tracking-wide text-blue">
            Today&apos;s walk-ins ({todayList.length})
          </p>
          <ul className="mt-2 space-y-1.5">
            {todayList.map((w) => (
              <li key={w.id} className="flex items-center justify-between text-sm text-text">
                <span>
                  {w.clientName}
                  {w.note && <span className="text-blue"> — {w.note}</span>}
                </span>
                <span className="text-xs text-blue">{timeOnly(w.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
