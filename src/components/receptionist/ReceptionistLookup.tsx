'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { LookupIcon } from '@/components/receptionist/icons'

type SearchResult = { id: string; name: string; clientCode: string; counselorName: string }

export function ReceptionistLookup() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)

  // Live search-as-you-type by name, phone, email, or AV-code — same
  // endpoint WalkIn and Correction already use, instead of requiring the
  // exact AV-code this card used to need.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
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

  return (
    <Card variant="blue" className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green/20 text-orange">
          <LookupIcon className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-grad-orange">Look up a client</p>
      </div>

      <div className="relative mt-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(null)
          }}
          placeholder="Search by name, phone, email, or AV-code"
          className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
        />
        {searching && <p className="mt-1 text-xs text-green/80">Searching…</p>}
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-green/25 rounded-xl border border-green/30">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(r)
                    setResults([])
                    setQuery('')
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-green/10"
                >
                  <span>
                    <span className="font-semibold text-green">{r.name}</span>{' '}
                    <span className="text-orange">· {r.clientCode}</span>
                  </span>
                  <span className="text-xs text-orange">{r.counselorName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-green/30 px-3 py-2 text-sm">
          <span>
            <span className="font-semibold text-green">{selected.name}</span>{' '}
            <span className="text-orange">· {selected.clientCode}</span>
            <span className="block text-xs text-orange">Counselor: {selected.counselorName}</span>
          </span>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs text-orange hover:text-green"
          >
            Clear
          </button>
        </div>
      )}
    </Card>
  )
}
