'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Mic, Square, User } from 'lucide-react'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
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
  backHref?: string
}

const ORANGE_GRADIENT = 'linear-gradient(145deg, #f5a24e 0%, #E48328 55%, #ca7220 100%)'

export function CounselorChatLayout({
  clientId,
  clientName,
  counselorId,
  counselorName,
  initialMessages,
  backHref,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [voiceUploading, setVoiceUploading] = useState(false)
  const { recording, start: startRecording, stop: stopRecording, cancel: cancelRecording } =
    useVoiceRecorder({
      onRecorded: async (blob, mimeType, ext) => {
        setVoiceUploading(true)
        try {
          const fd = new FormData()
          fd.append('clientId', clientId)
          fd.append('mimeType', mimeType)
          fd.append('audio', blob, `voice-${Date.now()}.${ext}`)
          const res = await fetch('/api/counselor/chat/voice', { method: 'POST', body: fd })
          const data = await res.json()
          if (!res.ok) return
          setMessages((prev) => [...prev, data.message])
        } finally {
          setVoiceUploading(false)
        }
      },
    })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Focus input on mount ───────────────────────────────────────────────
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

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
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
        <Link
          href={backHref ?? `/dashboard/clients/${clientId}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-white/30"
        >
          <ArrowLeft className="h-4 w-4 text-white/70" />
        </Link>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: 'rgba(245,162,78,0.20)' }}
        >
          <User className="h-4 w-4" style={{ color: '#f5a24e' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{clientName}</p>
          <p className="text-[10px] text-white/50">Chatting as {counselorName}</p>
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
            <User className="h-10 w-10 text-white/20" />
            <p className="text-sm text-white/40">No messages yet. Say hello to {clientName}.</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} counselorName={counselorName} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex shrink-0 items-center gap-3 border-t border-white/10 bg-white/5 px-4 py-3">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${clientName}…`}
          disabled={isSending || recording || voiceUploading}
          autoFocus
          autoComplete="off"
          className="min-h-[44px] min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm outline-none glass-input placeholder:text-white/30 disabled:opacity-50"
        />
        <button
          type="button"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startRecording() }}
          onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); stopRecording() }}
          onPointerCancel={() => cancelRecording()}
          disabled={isSending || voiceUploading}
          aria-label={recording ? 'Stop recording' : 'Hold to record voice note'}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all ${recording ? 'scale-110 bg-red-500/20 text-red-400' : 'text-white/50 hover:text-white'}`}
        >
          {recording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || recording || voiceUploading || !inputValue.trim()}
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
