'use client'

import { useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LookupIcon } from '@/components/receptionist/icons'

export function ReceptionistLookup() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ name: string; clientCode: string; counselorName: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/receptionist/lookup?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Not found')
        return
      }
      setResult(data)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="blue" className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <LookupIcon className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold">Look up a client by ID</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="AV-000123"
          className="min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm outline-none glass-input"
        />
        <Button type="submit" disabled={loading || !code.trim()}>
          {loading ? '…' : 'Look up'}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {result && (
        <p className="mt-3 text-sm text-bg/80">
          <span className="font-semibold">{result.name}</span> — counselor:{' '}
          <span className="font-semibold">{result.counselorName}</span>
        </p>
      )}
    </Card>
  )
}
