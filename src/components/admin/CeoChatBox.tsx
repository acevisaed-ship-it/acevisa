'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Bot, ArrowRight, Mic, Square, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { TypingIndicator } from '@/components/chat/TypingIndicator'

type ApiTurn = { role: 'user' | 'assistant'; content: string }
type ToolUsed = { name: string; input: unknown }
type Message = { role: 'user' | 'assistant'; text: string; toolsUsed?: ToolUsed[] }

const TOOL_LABELS: Record<string, string> = {
  search_clients: 'searched clients',
  get_client_case: 'pulled case detail',
  search_counselors: 'searched staff',
  get_counselor_overview: "checked a counselor's workload",
  list_all_counselors_summary: 'pulled team workload',
  get_tasks: 'looked up tasks',
  get_attendance_today: "checked today's attendance",
  get_pipeline_overview: 'pulled pipeline counts',
  assign_task: 'assigned a task',
}

/** Ask-anything, act-on-command chat for the CEO — reads live portal data
 * via tool calls (see /api/ceo-agent/chat + src/lib/ceoAgentTools.ts) and
 * can assign a task immediately when explicitly told to. Distinct from the
 * approve/reject drafts queue above it on this page: those are the AI's
 * own proactive suggestions awaiting sign-off, this executes the CEO's
 * direct instructions right away, since the CEO's own command IS the
 * approval. Voice input transcribes via the browser (no server upload)
 * into the text box for review before sending — never auto-sent, since a
 * misheard word could assign the wrong task to the wrong person. */
export function CeoChatBox() {
  const [messages, setMessages] = useState<Message[]>([])
  const [apiHistory, setApiHistory] = useState<ApiTurn[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const { recording, seconds, start, stop } = useVoiceRecorder({
    onRecorded: async (_blob, _mime, _ext, transcript) => {
      if (transcript?.trim()) {
        setInput((cur) => (cur ? `${cur} ${transcript.trim()}` : transcript.trim()))
      } else {
        setVoiceError("Didn't catch that — try again or type it instead.")
        setTimeout(() => setVoiceError(''), 4000)
      }
    },
    onError: (msg) => {
      setVoiceError(msg)
      setTimeout(() => setVoiceError(''), 4000)
    },
  })

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
      setInput('')
      setIsLoading(true)

      try {
        const res = await fetch('/api/ceo-agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, conversationHistory: apiHistory }),
        })
        const data = await res.json()

        if (!res.ok) {
          setMessages((prev) => [...prev, { role: 'assistant', text: data.error || 'Something went wrong.' }])
          return
        }

        setApiHistory((prev) => [...prev, { role: 'user', content: trimmed }, { role: 'assistant', content: data.reply }])
        setMessages((prev) => [...prev, { role: 'assistant', text: data.reply, toolsUsed: data.toolsUsed ?? [] }])
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', text: 'Network error — please try again.' }])
      } finally {
        setIsLoading(false)
      }
    },
    [apiHistory, isLoading]
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  return (
    <div className="rounded-2xl border border-white/10 glass-card crisp-on-dark p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue/15">
          <Sparkles className="h-4 w-4 text-blue" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Ask the portal anything</h2>
          <p className="text-[11px] text-white/40">
            Any case, counselor, or task — or say "assign a task to…" and it happens immediately.
          </p>
        </div>
      </div>

      <div
        className="flex min-h-[220px] flex-1 flex-col gap-3 overflow-y-auto rounded-2xl p-4"
        style={{ background: 'rgba(0,0,0,0.15)', maxHeight: '440px' }}
      >
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <Bot className="h-8 w-8 text-white/20" />
            <p className="max-w-xs text-sm text-white/40">
              Try "how's Ahmed's case doing" or "assign Sara a task to call the Khan family today"
            </p>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-grad-blue crisp-on-dark px-4 py-2.5 text-sm leading-relaxed text-white">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start gap-2">
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue/15">
                <Bot className="h-3.5 w-3.5 text-blue" />
              </div>
              <div className="max-w-[85%]">
                <div className="rounded-2xl rounded-bl-sm glass-card px-4 py-3 text-sm leading-relaxed text-white/90">
                  {msg.text}
                </div>
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Array.from(new Set(msg.toolsUsed.map((t) => t.name))).map((name) => (
                      <span key={name} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/35">
                        {TOOL_LABELS[name] ?? name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {isLoading && (
          <div className="flex justify-start gap-2">
            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue/15">
              <Bot className="h-3.5 w-3.5 text-blue" />
            </div>
            <div className="rounded-2xl rounded-bl-sm glass-card px-4 py-3">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {voiceError && <p className="mt-2 text-xs text-orange">{voiceError}</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={recording ? stop : start}
          disabled={isLoading}
          aria-label={recording ? 'Stop recording' : 'Record a voice command'}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40',
            recording ? 'bg-red-500 text-white' : 'glass-card text-white/60 hover:text-white'
          )}
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={recording ? `Listening… ${seconds}s` : 'Ask a question, or give an instruction…'}
          disabled={isLoading}
          className="min-h-[48px] min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm outline-none glass-input disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grad-green crisp-on-dark text-text transition-opacity disabled:opacity-40"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
