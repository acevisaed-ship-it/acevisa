'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageCircle, LayoutList, Bell, User } from 'lucide-react'
import type { ChatMessage } from '@/types'
import { ChatBubble } from './ChatBubble'
import { ChatInput } from './ChatInput'
import { MeetingsPanel } from './MeetingsPanel'
import { ProgressStrip } from './ProgressStrip'
import { TypingIndicator } from './TypingIndicator'
import { UpdatesFeed } from './UpdatesFeed'
import { MeetingRequestModal } from './MeetingRequestModal'
import { DocumentsCard } from './DocumentsCard'
import { ApplicationCard } from './ApplicationCard'
import { ComplaintCard } from './ComplaintCard'

// ── Types ──────────────────────────────────────────────────────────────────
type Meeting = {
  id: string
  scheduled_time: string
  status: 'scheduled' | 'completed' | 'cancelled'
  counselor_id: string
}

type ClientData = {
  name: string
  phone: string
  email: string | null
  city: string | null
  target_country: string | null
  interested_in: string | null
  pipeline_stage: number
}

type Props = {
  clientId: string
  clientName: string
  initialStage: number
  initialClient: ClientData | null
  counselorName: string | null
  initialMeetings: Meeting[]
}

// ── Glass panel style ──────────────────────────────────────────────────────
const glassPanel: React.CSSProperties = {
  background: 'rgba(238,238,237,0.12)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
}

const MEETING_SUCCESS_MSG =
  'Your meeting request has been sent! A counselor will confirm your slot within a few hours.'

type MobileTab = 'chat' | 'progress' | 'updates' | 'profile'

// ── Component ──────────────────────────────────────────────────────────────
export function ChatLayout({
  clientId,
  clientName,
  initialStage,
  initialClient,
  counselorName,
  initialMeetings,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')
  const [stage, setStage] = useState(initialStage)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Load history ───────────────────────────────────────────────────────
  useEffect(() => {
    async function loadHistory() {
      const res = await fetch(`/api/chat/history?clientId=${clientId}`)
      const data = await res.json()
      if (data.messages?.length) {
        setMessages(data.messages)
        return
      }
      // No history — trigger init greeting
      setIsLoading(true)
      try {
        const initRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, message: '__init__' }),
        })
        const initData = await initRes.json()
        if (initData.content) {
          setMessages([{
            id: crypto.randomUUID(),
            sender: 'ai',
            message_text: initData.content,
            timestamp: new Date().toISOString(),
          }])
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadHistory()
  }, [clientId])

  // ── Auto-scroll to bottom ──────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // ── Auto-focus input after send ────────────────────────────────────────
  const refocusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    const studentMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'student',
      message_text: message,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, studentMsg])
    setInputValue('')
    setIsLoading(true)
    refocusInput()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, message }),
      })
      const data = await res.json()

      if (data.content) {
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          sender: 'ai',
          message_text: data.content,
          timestamp: new Date().toISOString(),
        }])
      }
      // Update stage if AI moved it
      if (data.newStage) setStage(data.newStage)
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, isLoading, refocusInput])

  // ── Attachment sent callback ───────────────────────────────────────────
  const handleAttachmentSent = useCallback((studentMsg: unknown, aiMsg: unknown) => {
    setMessages((prev) => [...prev, studentMsg as ChatMessage, aiMsg as ChatMessage])
    refocusInput()
  }, [refocusInput])

  const handleMeetingSuccess = useCallback(() => {
    setShowMeetingModal(false)
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      sender: 'ai',
      message_text: MEETING_SUCCESS_MSG,
      timestamp: new Date().toISOString(),
    }])
  }, [])

  // ── Chat thread ────────────────────────────────────────────────────────
  const chatThread = (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Progress strip */}
      <ProgressStrip currentStage={stage} />

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <MessageCircle className="h-10 w-10 text-white/20" />
            <p className="text-sm text-white/40">Starting your session…</p>
          </div>
        )}
        {messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        ref={inputRef}
        clientId={clientId}
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onAttachmentSent={handleAttachmentSent}
        disabled={isLoading}
      />
    </div>
  )

  // ── DESKTOP layout (lg+) ───────────────────────────────────────────────
  const desktopLayout = (
    <div className="hidden h-full lg:grid lg:grid-cols-[280px_1fr_260px]">

      {/* Left panel */}
      <aside className="flex min-h-0 flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <img src="/logo.png" alt="ACE" className="h-7 w-auto" />
          <span className="text-sm font-bold text-white/80">ACE Altius</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          <div className="flex flex-col gap-3 p-3">
            <MeetingsPanel
              clientId={clientId}
              client={initialClient}
              counselorName={counselorName}
              meetings={initialMeetings}
              onRequestMeeting={() => setShowMeetingModal(true)}
            />
            <DocumentsCard clientId={clientId} />
            <ComplaintCard clientId={clientId} />
          </div>
        </div>
      </aside>

      {/* Center — chat */}
      <main className="flex min-h-0 flex-col overflow-hidden">
        {/* Header */}
        <div
          className="flex shrink-0 items-center gap-3 px-5 py-3"
          style={glassPanel}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <MessageCircle className="h-4 w-4 text-white/70" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">ACE AI Counselor</p>
            <p className="text-[10px] text-green-400">● Online now</p>
          </div>
        </div>
        {chatThread}
      </main>

      {/* Right panel */}
      <aside className="flex min-h-0 flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <Bell className="h-4 w-4 text-white/60" />
          <span className="text-sm font-semibold text-white">Updates</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3" style={{ overscrollBehavior: 'contain' }}>
          <ApplicationCard currentStage={stage} />
          <div className="min-h-0 flex-1">
            <UpdatesFeed clientId={clientId} />
          </div>
        </div>
      </aside>
    </div>
  )

  // ── MOBILE layout (<lg) ────────────────────────────────────────────────
  const mobileLayout = (
    <div className="flex h-full flex-col lg:hidden">
      {/* Mobile header */}
      <div
        className="flex shrink-0 items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(238,238,237,0.08)' }}
      >
        <img src="/logo.png" alt="ACE" className="h-6 w-auto" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">
            {mobileTab === 'chat' ? 'ACE AI Counselor'
              : mobileTab === 'progress' ? 'My Progress'
              : mobileTab === 'updates' ? 'Updates'
              : clientName}
          </p>
          {mobileTab === 'chat' && <p className="text-[10px] text-green-400">● Online now</p>}
        </div>
      </div>

      {/* Tab content — padded so content clears the fixed bottom nav */}
      <div className="min-h-0 flex-1 overflow-hidden" style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}>
        {mobileTab === 'chat' && chatThread}

        {mobileTab === 'progress' && (
          <div className="h-full overflow-y-auto p-4" style={{ overscrollBehavior: 'contain' }}>
            <div className="flex flex-col gap-4">
              {[
                { stage: 1, label: 'Initial Consultation', desc: 'First contact and eligibility check' },
                { stage: 2, label: 'Qualified', desc: 'Your case has been assessed' },
                { stage: 3, label: 'Registered', desc: 'You are a registered client' },
                { stage: 4, label: 'Documents', desc: 'Document collection in progress' },
                { stage: 5, label: 'Application', desc: 'Application submitted' },
                { stage: 6, label: 'Visa Decision', desc: 'Awaiting or received visa outcome' },
                { stage: 7, label: 'Admitted 🎉', desc: 'Congratulations!' },
              ].map((s) => {
                const done = s.stage < stage
                const active = s.stage === stage
                return (
                  <div key={s.stage} className="flex items-start gap-4">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? 'bg-green-400/20 text-green-300' : active ? 'bg-white text-[#0a3f3a]' : 'bg-white/10 text-white/30'
                    }`}>
                      {done ? '✓' : s.stage}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${active ? 'text-white' : done ? 'text-white/60' : 'text-white/30'}`}>
                        {s.label}
                      </p>
                      <p className={`text-xs ${active ? 'text-white/70' : 'text-white/30'}`}>{s.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {mobileTab === 'updates' && (
          <div className="h-full overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            <div className="flex flex-col gap-3 p-3">
              <ApplicationCard currentStage={stage} />
              <UpdatesFeed clientId={clientId} />
            </div>
          </div>
        )}

        {mobileTab === 'profile' && (
          <div className="h-full overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            <div className="flex flex-col gap-3 p-3">
              <MeetingsPanel
                clientId={clientId}
                client={initialClient}
                counselorName={counselorName}
                meetings={initialMeetings}
                onRequestMeeting={() => setShowMeetingModal(true)}
              />
              <DocumentsCard clientId={clientId} />
              <ComplaintCard clientId={clientId} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom tab bar — fixed so keyboard does not push it up */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 pb-[env(safe-area-inset-bottom,0px)]"
        style={{ background: 'rgba(4,80,71,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        {([
          { id: 'chat',     Icon: MessageCircle, label: 'Chat' },
          { id: 'progress', Icon: LayoutList,    label: 'Progress' },
          { id: 'updates',  Icon: Bell,          label: 'Updates' },
          { id: 'profile',  Icon: User,          label: 'Profile' },
        ] as { id: MobileTab; Icon: React.ElementType; label: string }[]).map(({ id, Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobileTab(id)}
            className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors ${
              mobileTab === id ? 'text-green-300' : 'text-white/40'
            }`}
          >
            <Icon className={`h-5 w-5 ${mobileTab === id ? 'text-green-300' : 'text-white/40'}`} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )

  return (
    <div
      className="h-dvh overflow-hidden"
      style={{ background: 'var(--grad-teal)' }}
    >
      {desktopLayout}
      {mobileLayout}

      {showMeetingModal && (
        <MeetingRequestModal
          clientId={clientId}
          onClose={() => setShowMeetingModal(false)}
          onSuccess={handleMeetingSuccess}
        />
      )}
    </div>
  )
}
