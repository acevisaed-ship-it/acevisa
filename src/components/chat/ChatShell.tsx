'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import type { ChatMessage } from '@/types'
import { ChatBubble } from './ChatBubble'
import { ChatHeader } from './ChatHeader'
import { ChatInput } from './ChatInput'
import { MeetingRequestModal } from './MeetingRequestModal'
import { TypingIndicator } from './TypingIndicator'

const MEETING_SUCCESS_MSG =
  'Your meeting request has been sent! A counselor will confirm your slot within a few hours.'

type Props = {
  clientId: string
  clientName: string
  clientLanguage?: string | null
}

export function ChatShell({ clientId, clientName, clientLanguage }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showMeetingModal, setShowMeetingModal] = useState(false)

  useEffect(() => {
    async function loadHistory() {
      const res = await fetch(`/api/chat/history?clientId=${clientId}`)
      const data = await res.json()
      if (data.messages?.length) {
        setMessages(data.messages)
        return
      }

      setIsLoading(true)
      try {
        const initRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, message: '__init__' }),
        })
        const initData = await initRes.json()
        if (initData.content) {
          setMessages([
            {
              id: crypto.randomUUID(),
              sender: 'ai',
              message_text: initData.content,
              timestamp: new Date().toISOString(),
            },
          ])
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadHistory()
  }, [clientId])

  const handleSend = async (message: string) => {
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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, message }),
      })

      const data = await res.json()

      if (data.content) {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'ai',
          message_text: data.content,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMsg])
      }

      if (data.type === 'conversation_complete' && data.score >= 7) {
        setTimeout(() => {
          window.location.href = `/schedule/${clientId}`
        }, 3000)
      }
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMeetingSuccess = () => {
    setShowMeetingModal(false)
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: 'ai',
        message_text: MEETING_SUCCESS_MSG,
        timestamp: new Date().toISOString(),
      },
    ])
  }

  return (
    <div className="mx-auto flex h-full max-w-[390px] flex-col bg-bg">
      {/* Hidden on mobile — StudentSidebar already provides the fixed top bar */}
      <div className="hidden lg:block">
        <ChatHeader clientName={clientName} homeHref={`/portal?clientId=${clientId}`} />
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-blue/40"
              aria-hidden="true"
            >
              <path
                d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-text/60">Send a message and a counselor will reply shortly.</p>
          </div>
        ) : (
          messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
        )}
        {isLoading && <TypingIndicator />}
      </div>

      {/* Meeting options row — above input bar */}
      <div className="flex gap-2 px-3 pb-2">
        <a
          href={`/schedule/${clientId}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#B7C733] bg-[#B7C733]/10 px-3 py-2 text-sm font-semibold text-[#0A3F3A] transition-colors hover:bg-[#B7C733]/20"
        >
          <Calendar size={15} />
          Book a slot →
        </a>

        <button
          type="button"
          onClick={() => setShowMeetingModal(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#2083B9] bg-[#2083B9]/10 px-3 py-2 text-sm font-semibold text-[#2083B9] transition-colors hover:bg-[#2083B9]/20"
        >
          <Clock size={15} />
          Request time
        </button>
      </div>

      <ChatInput
        clientId={clientId}
        clientLanguage={clientLanguage}
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onAiPendingChange={setIsLoading}
        onAttachmentSent={async (studentMsg, aiMsg) => {
          try {
            const histRes = await fetch(`/api/chat/history?clientId=${clientId}`)
            const histData = await histRes.json()
            if (histData.messages?.length) {
              setMessages(histData.messages)
            } else {
              setMessages((prev) => [
                ...prev,
                studentMsg as ChatMessage,
                ...(aiMsg ? [aiMsg as ChatMessage] : []),
              ])
            }
          } catch {
            setMessages((prev) => [
              ...prev,
              studentMsg as ChatMessage,
              ...(aiMsg ? [aiMsg as ChatMessage] : []),
            ])
          }
        }}
        disabled={isLoading}
      />

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
