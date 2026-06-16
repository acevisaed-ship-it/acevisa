'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, MessageSquare, Plus, X, Send,
} from 'lucide-react'

type Complaint = {
  id: string
  question_text: string
  status: 'open' | 'answered' | 'added_to_kb'
  counselor_response: string | null
  timestamp: string
}

type Props = { clientId: string }

const glassPanel = {
  background: 'rgba(238,238,237,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
} as React.CSSProperties

const STATUS_CFG = {
  open:        { label: 'Open',     color: 'text-orange bg-orange/10',         Icon: AlertCircle },
  answered:    { label: 'Answered', color: 'text-green-300 bg-green-400/10',   Icon: CheckCircle2 },
  added_to_kb: { label: 'Resolved', color: 'text-white/40 bg-white/5',          Icon: CheckCircle2 },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ComplaintCard({ clientId }: Props) {
  const [open, setOpen]           = useState(false)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [text, setText]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`/api/chat/complaints?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d) => setComplaints(d.complaints ?? []))
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => {
    if (showForm) setTimeout(() => textareaRef.current?.focus(), 50)
  }, [showForm])

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/chat/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, text: text.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setComplaints((prev) => [data.complaint, ...prev])
      setText('')
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const openCount = complaints.filter((c) => c.status === 'open').length

  return (
    <div className="rounded-2xl p-3" style={glassPanel}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-white/60" />
          <span className="text-sm font-semibold text-white">Raise a Complaint</span>
          {openCount > 0 && (
            <span className="rounded-full bg-orange/20 px-1.5 py-0.5 text-[10px] font-bold text-orange">
              {openCount} open
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {/* New complaint form */}
          {showForm ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe your complaint or concern…"
                rows={3}
                className="w-full resize-none rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/20"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              {error && <p className="text-[10px] text-orange">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setText(''); setError(null) }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs text-white/40 hover:text-white/70 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !text.trim()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition-all disabled:opacity-40"
                  style={{ background: 'rgba(228,131,40,0.3)', border: '1px solid rgba(228,131,40,0.4)' }}
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? 'Sending…' : 'Submit'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs text-white/60 transition-colors hover:text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.15)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              New complaint
            </button>
          )}

          {/* Existing complaints */}
          {loading && (
            <div className="h-8 animate-pulse rounded-lg bg-white/5" />
          )}

          {!loading && complaints.length === 0 && !showForm && (
            <p className="text-xs text-white/30">No complaints raised yet.</p>
          )}

          {!loading && complaints.map((c) => {
            const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.open
            const StatusIcon = cfg.Icon
            return (
              <div key={c.id} className="flex flex-col gap-1 rounded-xl px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-[11px] text-white/80 leading-snug line-clamp-2">{c.question_text}</p>
                  <span className={`shrink-0 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${cfg.color}`}>
                    <StatusIcon className="h-2.5 w-2.5" />
                    {cfg.label}
                  </span>
                </div>
                {c.counselor_response && (
                  <p className="rounded-lg bg-white/5 px-2 py-1.5 text-[10px] text-white/60 leading-snug">
                    ↳ {c.counselor_response}
                  </p>
                )}
                <p className="text-[9px] text-white/25">{timeAgo(c.timestamp)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
