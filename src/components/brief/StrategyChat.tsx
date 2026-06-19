'use client'

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import { Bot, ArrowRight, CheckCircle2, Circle, Target, Trash2 } from 'lucide-react'
import { TypingIndicator } from '@/components/chat/TypingIndicator'

// ── Types ──────────────────────────────────────────────────────────────────

type ApiTurn = { role: 'user' | 'assistant'; content: string }

type MessageKind =
  | { kind: 'counselor'; text: string }
  | { kind: 'analysis'; text: string }
  | { kind: 'objective_set'; analysis: string; objectiveId: string | null }

type Objective = {
  id: string
  objective_text: string
  plan_text: string | null
  status: 'active' | 'completed'
  created_at: string
}

type Props = {
  clientId: string
  clientName?: string
}

// ── Styles ──────────────────────────────────────────────────────────────────

const COUNSELOR_BUBBLE: React.CSSProperties = {
  background: 'linear-gradient(145deg, #f5a24e 0%, #E48328 55%, #ca7220 100%)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
}

const ANALYSIS_BUBBLE: React.CSSProperties = {
  background: 'linear-gradient(145deg, #35a5e0 0%, #2083B9 55%, #176fa0 100%)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
}

const OBJECTIVE_CONFIRM: React.CSSProperties = {
  background: 'rgba(245,162,78,0.08)',
  border: '1px solid rgba(245,162,78,0.30)',
}

// ── ObjectivesList ──────────────────────────────────────────────────────────

function ObjectivesList({
  clientId,
  refreshKey,
}: {
  clientId: string
  refreshKey: number
}) {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)

  const fetchObjectives = useCallback(async () => {
    const res = await fetch(`/api/counselor/objectives?clientId=${clientId}`)
    const data = await res.json()
    setObjectives(data.objectives ?? [])
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchObjectives()
  }, [fetchObjectives, refreshKey])

  const toggle = async (obj: Objective) => {
    const newStatus = obj.status === 'active' ? 'completed' : 'active'
    await fetch(`/api/counselor/objectives/${obj.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setObjectives((prev) =>
      prev.map((o) => (o.id === obj.id ? { ...o, status: newStatus } : o))
    )
  }

  const active = objectives.filter((o) => o.status === 'active')
  const completed = objectives.filter((o) => o.status === 'completed')

  if (loading) return null
  if (!objectives.length) return null

  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(245,162,78,0.15)' }}>
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-4 w-4" style={{ color: '#f5a24e' }} />
        <span className="text-xs font-bold" style={{ color: '#f5a24e' }}>
          Active Objectives ({active.length})
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {active.map((obj) => (
          <ObjectiveRow key={obj.id} obj={obj} onToggle={toggle} />
        ))}
        {completed.length > 0 && active.length > 0 && (
          <div className="my-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        )}
        {completed.map((obj) => (
          <ObjectiveRow key={obj.id} obj={obj} onToggle={toggle} />
        ))}
      </div>
    </div>
  )
}

function ObjectiveRow({
  obj,
  onToggle,
}: {
  obj: Objective
  onToggle: (obj: Objective) => void
}) {
  const [showPlan, setShowPlan] = useState(false)
  const done = obj.status === 'completed'

  return (
    <div
      className="rounded-xl px-3 py-2.5 transition-opacity"
      style={{
        background: done ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${done ? 'rgba(255,255,255,0.06)' : 'rgba(245,162,78,0.20)'}`,
        opacity: done ? 0.6 : 1,
      }}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onToggle(obj)}
          className="mt-0.5 shrink-0 transition-opacity hover:opacity-80"
          title={done ? 'Mark active' : 'Mark complete'}
        >
          {done
            ? <CheckCircle2 className="h-4 w-4 text-green-400" />
            : <Circle className="h-4 w-4" style={{ color: '#f5a24e' }} />
          }
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-xs leading-relaxed ${done ? 'line-through text-white/40' : 'text-white/80'}`}>
            {obj.objective_text}
          </p>
          {obj.plan_text && !done && (
            <button
              type="button"
              onClick={() => setShowPlan((s) => !s)}
              className="mt-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              {showPlan ? 'Hide plan ↑' : 'Show AI plan ↓'}
            </button>
          )}
          {showPlan && obj.plan_text && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/50 italic">
              {obj.plan_text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function StrategyChat({ clientId, clientName }: Props) {
  const [messages, setMessages] = useState<MessageKind[]>([])
  const [apiHistory, setApiHistory] = useState<ApiTurn[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [objectivesRefreshKey, setObjectivesRefreshKey] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setMessages((prev) => [...prev, { kind: 'counselor', text: trimmed }])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/counselor/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          clientId,
          conversationHistory: apiHistory,
        }),
      })

      const data = await res.json()
      const assistantContent = data.analysis ?? ''

      setApiHistory((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: assistantContent },
      ])

      if (data.type === 'objective_set') {
        setMessages((prev) => [
          ...prev,
          { kind: 'objective_set', analysis: assistantContent, objectiveId: data.objectiveId },
        ])
        setObjectivesRefreshKey((k) => k + 1)
      } else {
        setMessages((prev) => [...prev, { kind: 'analysis', text: assistantContent }])
      }
    } catch (err) {
      console.error('Strategy chat error:', err)
      setMessages((prev) => [
        ...prev,
        { kind: 'analysis', text: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: 'rgba(32,131,185,0.15)', border: '1px solid rgba(32,131,185,0.25)' }}
        >
          <Bot className="h-4 w-4 text-blue" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-blue">Strategy Assistant</h2>
          <p className="text-[10px] text-text/50">
            {clientName ? `Case intelligence for ${clientName}` : 'Case intelligence · Objective setting'}
          </p>
        </div>
      </div>

      {/* Objectives list — shows all active/completed objectives */}
      <ObjectivesList clientId={clientId} refreshKey={objectivesRefreshKey} />

      {/* Message list */}
      <div
        className="flex min-h-[280px] flex-1 flex-col gap-3 overflow-y-auto rounded-2xl p-4"
        style={{ background: 'rgba(0,0,0,0.06)', maxHeight: '420px' }}
      >
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <Bot className="h-8 w-8 text-text/20" />
            <p className="text-sm text-text/40">
              Ask about the case, or give an objective like{' '}
              <em>&ldquo;get them to pay the processing fee&rdquo;</em>
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.kind === 'counselor') {
            return (
              <div key={i} className="flex justify-end">
                <div
                  className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed text-white"
                  style={COUNSELOR_BUBBLE}
                >
                  {msg.text}
                </div>
              </div>
            )
          }

          if (msg.kind === 'analysis') {
            return (
              <div key={i} className="flex justify-start gap-2">
                <div
                  className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(32,131,185,0.15)' }}
                >
                  <Bot className="h-3.5 w-3.5 text-blue" />
                </div>
                <div
                  className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed text-white"
                  style={ANALYSIS_BUBBLE}
                >
                  {msg.text}
                </div>
              </div>
            )
          }

          if (msg.kind === 'objective_set') {
            return (
              <div key={i} className="flex justify-start gap-2">
                <div
                  className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(245,162,78,0.15)' }}
                >
                  <Target className="h-3.5 w-3.5" style={{ color: '#f5a24e' }} />
                </div>
                <div
                  className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3"
                  style={OBJECTIVE_CONFIRM}
                >
                  <p className="mb-1 text-[10px] font-bold" style={{ color: '#f5a24e' }}>
                    Objective set ✓
                  </p>
                  <p className="text-sm leading-relaxed text-white/80">{msg.analysis}</p>
                </div>
              </div>
            )
          }

          return null
        })}

        {isLoading && (
          <div className="flex justify-start gap-2">
            <div
              className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(32,131,185,0.15)' }}
            >
              <Bot className="h-3.5 w-3.5 text-blue" />
            </div>
            <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={ANALYSIS_BUBBLE}>
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="mt-4 flex shrink-0 items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the case, or: get them to pay the processing fee…"
          disabled={isLoading}
          className="min-h-[48px] min-w-0 flex-1 rounded-full border border-text/20 bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text/40 outline-none focus:border-blue disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-opacity disabled:opacity-40"
          style={{ background: 'var(--color-green)' }}
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
