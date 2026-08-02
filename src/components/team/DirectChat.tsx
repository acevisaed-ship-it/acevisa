'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { MY_BUBBLE, senderColor, Avatar, timeAgo } from './TeamHub'

type Message = {
  id: string
  sender_id: string
  sender_name: string
  recipient_id: string
  content: string
  created_at: string
}

type Props = {
  currentUserId: string
  peerId: string
  peerName: string
  onClose: () => void
}

export function DirectChat({ currentUserId, peerId, peerName, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/team/dm/${peerId}`)
    const data = await res.json()
    setMessages(data.messages ?? [])
    setLoading(false)
  }, [peerId])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`dm_${[currentUserId, peerId].sort().join('_')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const m = payload.new as Message
        const belongsToThisPair =
          (m.sender_id === currentUserId && m.recipient_id === peerId) ||
          (m.sender_id === peerId && m.recipient_id === currentUserId)
        if (!belongsToThisPair) return
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, peerId])

  useEffect(() => {
    const poll = setInterval(loadMessages, 3000)
    return () => clearInterval(poll)
  }, [loadMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    await fetch(`/api/team/dm/${peerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setContent('')
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <button onClick={onClose} className="text-white/40 hover:text-white lg:hidden">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar name={peerName} initials={peerName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)} size={32} />
        <span className="text-sm font-semibold text-white flex-1">{peerName}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-white/30 py-12">No messages yet. Say hi to {peerName}.</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId
            const color = senderColor(msg.sender_name)
            return (
              <div key={msg.id} className={cn('flex items-end gap-2.5', isMine && 'flex-row-reverse')}>
                <div className={cn('max-w-[68%] flex flex-col', isMine && 'items-end')}>
                  <div className={cn(
                    'px-3.5 py-2.5 text-sm leading-relaxed',
                    isMine ? `${MY_BUBBLE} rounded-2xl rounded-br-sm` : `${color.bubble} rounded-2xl rounded-bl-sm`
                  )}>
                    {msg.content}
                  </div>
                  <p className="mt-1 text-[10px] text-white/20 px-1">{timeAgo(msg.created_at)}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-white/10 p-3 shrink-0">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Message ${peerName}…`}
          className="flex-1 min-h-[44px] rounded-xl px-3 text-sm outline-none glass-input"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
        />
        <button type="submit" disabled={sending || !content.trim()} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-grad-blue crisp-on-dark disabled:opacity-40">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-white" />}
        </button>
      </form>
    </div>
  )
}
