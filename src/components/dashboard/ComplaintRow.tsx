'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

type Props = {
  id: string
  clientName: string
  subject: string
  createdAt: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ComplaintRow({ id, clientName, subject, createdAt }: Props) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAcknowledge() {
    setLoading(true)
    try {
      const res = await fetch(`/api/complaints/${id}/acknowledge`, { method: 'PATCH' })
      if (res.ok) {
        setAcknowledged(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (acknowledged) return null

  return (
    <div className="flex items-start gap-3 rounded-xl glass-card crisp-on-dark px-4 py-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-white">{clientName}</p>
        <p className="text-sm text-white/70">{subject}</p>
        <p className="mt-1 text-xs text-white/40">{timeAgo(createdAt)}</p>
      </div>
      <button
        type="button"
        onClick={handleAcknowledge}
        disabled={loading}
        className="shrink-0 rounded-full bg-grad-blue crisp-on-dark px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Acknowledge'}
      </button>
    </div>
  )
}
