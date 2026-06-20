'use client'

import { useCallback, useEffect, useState } from 'react'
import { Brain, ChevronDown, ChevronUp, RefreshCw, AlertTriangle } from 'lucide-react'
import { BriefCard } from './BriefCard'

type PsychRead = {
  personality_type: string
  communication_style: string
  emotional_state: string
  trust_level: string
  decision_making: string
}

type AnalysisNote = {
  id: string
  analyzed_at: string
  message_count: number
  messages_since_last: number
  psychological_read: PsychRead
  behavioral_observations: string[]
  delta_from_last: string
  risk_flags: string[]
}

type Props = {
  clientId: string
}

export function BehavioralNotesSection({ clientId }: Props) {
  const [notes, setNotes] = useState<AnalysisNote[]>([])
  const [loading, setLoading] = useState(true)
  const [reanalysing, setReanalysing] = useState(false)
  const [reanalyseError, setReanalyseError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ai/behavioral-analysis?clientId=${clientId}`)
      const data = await res.json()
      if (res.ok) {
        setNotes(data.notes ?? [])
        if (data.notes?.length) setExpandedId(data.notes[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { void load() }, [load])

  async function handleReanalyse() {
    setReanalysing(true)
    setReanalyseError(null)
    try {
      const res = await fetch('/api/ai/behavioral-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setReanalyseError(data.error ?? 'Analysis failed — check server logs')
        return
      }
      await load()
    } catch {
      setReanalyseError('Network error — please try again')
    } finally {
      setReanalysing(false)
    }
  }

  return (
    <BriefCard>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-white/60" />
          <h2 className="text-base font-semibold text-white">Behavioural Analysis</h2>
          {notes.length > 0 && (
            <span className="rounded-full glass-card px-2 py-0.5 text-xs font-medium text-white/60">
              {notes.length} session{notes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleReanalyse}
          disabled={reanalysing}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/60 hover:border-white/40 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${reanalysing ? 'animate-spin' : ''}`} />
          {reanalysing ? 'Analysing…' : 'Re-analyse'}
        </button>
      </div>

      {reanalyseError && (
        <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-2 text-xs text-red-400">
          {reanalyseError}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-white/50">Loading analysis…</p>
      ) : notes.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">
          No analysis yet. Click <strong>Re-analyse</strong> to run now, or it runs automatically after every 5 messages.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Latest — always expanded by default */}
          {notes.map((note, idx) => {
            const isLatest = idx === 0
            const isExpanded = expandedId === note.id
            const date = new Date(note.analyzed_at).toLocaleDateString('en-PK', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })

            return (
              <div
                key={note.id}
                className={`rounded-2xl border ${isLatest ? 'border-white/30 glass-card-md' : 'border-white/10 glass-card'}`}
              >
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : note.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {isLatest && (
                      <span className="rounded-full bg-blue px-2 py-0.5 text-[10px] font-bold text-white">
                        LATEST
                      </span>
                    )}
                    <span className="text-sm font-medium text-white/80">{date}</span>
                    <span className="text-xs text-white/40">
                      {note.message_count} msgs · {note.messages_since_last} new
                    </span>
                    {note.risk_flags?.length > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold text-orange">
                        <AlertTriangle className="h-3 w-3" />
                        {note.risk_flags.length} flag{note.risk_flags.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-white/40" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-4">
                    {/* Psychological read */}
                    {note.psychological_read && (
                      <div>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/50">
                          Psychological Read
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {Object.entries(note.psychological_read).map(([key, val]) => (
                            <div key={key} className="rounded-xl glass-card px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="mt-0.5 text-sm text-white/80">{val as string}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delta */}
                    {note.delta_from_last && (
                      <div>
                        <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-white/40">
                          Changes Since Last Session
                        </h3>
                        <p className="rounded-xl glass-card px-3 py-2 text-sm text-white/80">
                          {note.delta_from_last}
                        </p>
                      </div>
                    )}

                    {/* Observations */}
                    {note.behavioral_observations?.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">
                          Observations
                        </h3>
                        <ul className="space-y-1.5">
                          {note.behavioral_observations.map((obs, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue" />
                              {obs}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risk flags */}
                    {note.risk_flags?.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-orange">
                          Risk Flags
                        </h3>
                        <ul className="space-y-1.5">
                          {note.risk_flags.map((flag, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-orange">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </BriefCard>
  )
}
