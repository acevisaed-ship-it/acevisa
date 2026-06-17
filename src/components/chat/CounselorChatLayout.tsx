'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, User } from 'lucide-react'
import Link from 'next/link'
import type { ChatMessage } from '@/types'
import { ChatBubble } from './ChatBubble'
import { TypingIndicator } from './TypingIndicator'

type Props = {
  clientId: string
  clientName: string
  counselorId: string
  counselorName: string
  initialMessages: ChatMessage[]
}

const ORANGE_GRADIENT = 'linear-gradient(145deg, #f5a24e 0%, #E48328 55%, #ca7220 100%)'

export function CounselorChatLayout({
  clientId,
  clientName,
  counselorId,
  counselorName,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Set counselor_active on mount, clear on unmount ────────────────────
  useEffect(() => {
    const setActive = (active: boolean) =>
      fetch('/api/counselor/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, active }),
      }).catch(() => {})

    setActive(true)

    // Clear on tab close/navigate away
    window.addEventListener('beforeunload', () => setActive(false))
    return () => {
      setActive(false)
      window.removeEventListener('beforeunload', () => setActive(false))
    }
  }, [clientId])

  // ── Poll for new student messages every 3s ─────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/history?clientId=${clientId}`)
        const data = await res.json()
        if (!data.messages?.length) return
        setMessages((prev) => {
          const historyIds = new Set(data.messages.map((m: ChatMessage) => m.id))
          const lastHistoryTime = data.messages[data.messages.length - 1]?.timestamp ?? '0'
          const pending = prev.filter(
            (m) => !historyIds.has(m.id) && m.timestamp > lastHistoryTime
          )
          return [...data.messages, ...pending]
        })
      } catch {
        // Non-fatal
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [clientId])

  // ── Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message as counselor ──────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isSending) return

    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'counselor',
      counselor_name: counselorName,
      message_text: text,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimistic])
    setInputValue('')
    setIsSending(true)
    setTimeout(() => inputRef.current?.focus(), 50)

    try {
      await fetch('/api/counselor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, message: text, counselorName }),
      })
    } catch (err) {
      console.error('Counselor chat send error:', err)
    } finally {
      setIsSending(false)
    }
  }, [clientId, counselorName, inputValue, isSending])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-screen flex-col bg-bg">
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-3 border-b border-text/10 px-4 py-3"
        style={{ background: 'rgba(0,0,0,0.04)' }}
      >
        <Link
          href={`/dashboard/clients/${clientId}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-text/10 transition-colors hover:border-text/30"
        >
          <ArrowLeft className="h-4 w-4 text-text" />
        </Link>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: 'rgba(245,162,78,0.15)' }}
        >
          <User className="h-4 w-4" style={{ color: '#f5a24e' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-text">{clientName}</p>
          <p className="text-[10px] text-text/50">Chatting as {counselorName}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(245,162,78,0.12)', border: '1px solid rgba(245,162,78,0.25)' }}>
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          <span className="text-[10px] font-medium" style={{ color: '#f5a24e' }}>AI silenced</span>
        </div>
      </div>

      {/* Message list */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        style={{ overscrollBehavior: 'contain' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <User className="h-10 w-10 text-text/20" />
            <p className="text-sm text-text/40">No messages yet. Say hello to {clientName}.</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} counselorName={counselorName} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex shrink-0 items-center gap-3 border-t border-text/10 px-4 py-3"
        style={{ background: 'rgba(0,0,0,0.04)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${clientName}…`}
          disabled={isSending}
          className="min-h-[44px] min-w-0 flex-1 rounded-full border border-text/20 bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text/40 outline-none focus:border-text/40 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || !inputValue.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
          style={{ background: ORANGE_GRADIENT }}
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
