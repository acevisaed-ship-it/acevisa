'use client'

import { useState, type FormEvent } from 'react'
import { TypingIndicator } from '@/components/chat/TypingIndicator'

type ChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  clientId: string
}

export function StrategyChat({ clientId }: Props) {
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userTurn: ChatTurn = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userTurn]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/counselor/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          clientId,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()
      if (data.content) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.content }])
      }
    } catch (err) {
      console.error('Strategy chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="text-lg font-bold text-blue">Strategy Assistant</h2>
      <p className="mt-1 text-sm text-text/60">
        Ask anything about this client&apos;s case before the meeting.
      </p>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl bg-bg p-4 max-h-[50vh] sm:max-h-[400px]">
        {messages.length === 0 && !isLoading && (
          <p className="text-center text-sm text-text/40">
            Start by asking about visa strategy, objection handling, or case planning.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-bold leading-relaxed ${
                msg.role === 'assistant'
                  ? 'bg-blue text-white'
                  : 'bg-green text-text'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      <form onSubmit={handleSend} className="mt-4 flex shrink-0 items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about visa strategy, objection handling, case planning..."
          disabled={isLoading}
          className="min-h-[48px] min-w-0 flex-1 rounded-full border border-text/20 bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text/40 outline-none focus:border-blue disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green text-text transition-opacity disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  )
}
