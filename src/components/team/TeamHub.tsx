'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageSquare, Users, Send, X, ChevronLeft, Loader2, Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { PostsBoard, BOARD_THEMES } from './PostsBoard'
import { DirectChat } from './DirectChat'

type Message = {
  id: string
  sender_id: string
  sender_name: string
  sender_initials: string
  content: string
  created_at: string
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })
}

const NAMED_COLORS: Record<string, { bubble: string; avatar: string }> = {
  hashaam: {
    bubble: 'bg-gradient-to-br from-[#35a5e0]/50 to-[#2083B9]/35 text-blue-50',
    avatar: 'bg-gradient-to-br from-[#35a5e0]/50 to-[#2083B9]/35 text-blue-100',
  },
  arooj: {
    bubble: 'bg-gradient-to-br from-pink-200/50 to-pink-300/35 text-pink-950',
    avatar: 'bg-gradient-to-br from-pink-200/50 to-pink-300/35 text-pink-900',
  },
  aniqa: {
    bubble: 'bg-gradient-to-br from-pink-500/45 to-rose-600/30 text-pink-50',
    avatar: 'bg-gradient-to-br from-pink-500/45 to-rose-600/30 text-pink-100',
  },
  aneeqa: {
    bubble: 'bg-gradient-to-br from-pink-500/45 to-rose-600/30 text-pink-50',
    avatar: 'bg-gradient-to-br from-pink-500/45 to-rose-600/30 text-pink-100',
  },
  admin: {
    bubble: 'bg-gradient-to-br from-blue-700/55 to-blue-900/40 text-blue-100',
    avatar: 'bg-gradient-to-br from-blue-700/55 to-blue-900/40 text-blue-200',
  },
  osama: {
    bubble: 'bg-gradient-to-br from-[#f5a24e]/45 to-[#ca7220]/30 text-orange-50',
    avatar: 'bg-gradient-to-br from-[#f5a24e]/45 to-[#ca7220]/30 text-orange-100',
  },
}

const FALLBACK_COLORS = [
  { bubble: 'bg-teal-500/30 text-teal-100',   avatar: 'bg-teal-500/30 text-teal-200' },
  { bubble: 'bg-[#B7C733]/25 text-[#e4f09a]', avatar: 'bg-[#B7C733]/25 text-[#ccd94a]' },
  { bubble: 'bg-yellow-500/30 text-yellow-100', avatar: 'bg-yellow-500/30 text-yellow-200' },
  { bubble: 'bg-purple-500/30 text-purple-100', avatar: 'bg-purple-500/30 text-purple-200' },
]

export const MY_BUBBLE = 'bg-gradient-to-br from-[#35a5e0]/50 to-[#2083B9]/40 text-white'

export function senderColor(name: string) {
  const key = name.trim().split(' ')[0].toLowerCase()
  if (NAMED_COLORS[key]) return NAMED_COLORS[key]
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % FALLBACK_COLORS.length
  return FALLBACK_COLORS[hash]
}

function avatarColor(name: string) {
  return senderColor(name).avatar
}

export function Avatar({ name, initials, size = 32 }: { name: string; initials: string; size?: number }) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full text-xs font-semibold', avatarColor(name))}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

function GroupChat({ currentUserId }: { currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  function isNearBottom() {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    bottomRef.current?.scrollIntoView({ behavior })
  }

  const loadMessages = useCallback(async () => {
    const res = await fetch('/api/team/messages')
    const data = await res.json()
    setMessages(data.messages ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('team_messages_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, (payload) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === (payload.new as Message).id)) return prev
          return [...prev, payload.new as Message]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/team/messages')
        const data = await res.json()
        if (!data.messages?.length) return
        setMessages((prev) => {
          const incomingIds = new Set((data.messages as Message[]).map((m) => m.id))
          const lastTime = data.messages[data.messages.length - 1]?.created_at ?? '0'
          const pending = prev.filter((m) => !incomingIds.has(m.id) && m.created_at > lastTime)
          return [...data.messages, ...pending]
        })
      } catch { /* non-fatal */ }
    }, 1000)
    return () => clearInterval(poll)
  }, [])

  const prevCountRef = useRef(0)
  useEffect(() => {
    const count = messages.length
    if (count === 0) return
    if (prevCountRef.current === 0) {
      scrollToBottom('instant' as ScrollBehavior)
    } else if (count > prevCountRef.current && isNearBottom()) {
      scrollToBottom('smooth')
    }
    prevCountRef.current = count
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    await fetch('/api/team/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setContent('')
    setSending(false)
    scrollToBottom('smooth')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <Users className="h-4 w-4 text-white/40" />
        <span className="text-sm font-semibold text-white flex-1">Team chat</span>
        <span className="text-xs text-white/30">All members</span>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-8 w-8 text-white/10" />
            <p className="text-sm text-white/30">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId
            const color = senderColor(msg.sender_name)
            return (
              <div key={msg.id} className={cn('flex items-end gap-2.5', isMine && 'flex-row-reverse')}>
                {!isMine && (
                  <Avatar name={msg.sender_name} initials={msg.sender_initials} size={32} />
                )}
                <div className={cn('max-w-[68%] flex flex-col', isMine && 'items-end')}>
                  {!isMine && (
                    <p className="mb-1 ml-1 text-[11px] font-medium text-white/50">{msg.sender_name}</p>
                  )}
                  <div className={cn(
                    'px-3.5 py-2.5 text-sm leading-relaxed',
                    isMine
                      ? `${MY_BUBBLE} rounded-2xl rounded-br-sm`
                      : `${color.bubble} rounded-2xl rounded-bl-sm`
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
          placeholder="Message the team…"
          className="flex-1 min-h-[44px] rounded-xl px-3 text-sm outline-none glass-input"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-grad-blue crisp-on-dark disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-white" />}
        </button>
      </form>
    </div>
  )
}

type Tab = { type: 'group' } | { type: 'dm'; peerId: string; peerName: string }

function tabKey(tab: Tab) {
  return tab.type === 'group' ? 'group' : `dm:${tab.peerId}`
}

type MobileView = 'chat' | 'bulletin' | 'deadlines' | 'highlights'

export function TeamHub({ currentUserId }: { currentUserId: string }) {
  const [openTabs, setOpenTabs] = useState<Tab[]>([{ type: 'group' }])
  const [activeTabKey, setActiveTabKey] = useState('group')
  const [staff, setStaff] = useState<{ id: string; name: string; role: string }[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [mobileView, setMobileView] = useState<MobileView>('chat')
  const [mobileShowContent, setMobileShowContent] = useState(false)

  useEffect(() => {
    fetch('/api/team/staff').then((r) => r.json()).then((d) => setStaff(d.staff ?? []))
  }, [])

  useEffect(() => {
    const load = () => fetch('/api/team/dm/unread').then((r) => r.json()).then((d) => setUnreadCounts(d.counts ?? {}))
    load()
    const poll = setInterval(load, 5000)
    return () => clearInterval(poll)
  }, [])

  function openDm(peerId: string, peerName: string) {
    const key = `dm:${peerId}`
    setOpenTabs((prev) => (prev.some((t) => tabKey(t) === key) ? prev : [...prev, { type: 'dm', peerId, peerName }]))
    setActiveTabKey(key)
    setMobileView('chat')
    setUnreadCounts((prev) => ({ ...prev, [peerId]: 0 }))
  }

  function closeDm(peerId: string) {
    const key = `dm:${peerId}`
    setOpenTabs((prev) => prev.filter((t) => tabKey(t) !== key))
    if (activeTabKey === key) setActiveTabKey('group')
  }

  const activeDmTab = openTabs.find((t) => tabKey(t) === activeTabKey && t.type === 'dm')

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-112px)]">

      <div className="flex flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/10 glass-card crisp-on-dark">

        <div className={cn(
          'flex w-full flex-col border-r border-white/10 lg:w-52 lg:shrink-0',
          mobileShowContent && 'hidden lg:flex'
        )}>
          <div className="px-4 py-4 border-b border-white/10">
            <p className="text-sm font-semibold text-white">Team Hub</p>
          </div>
          <nav className="flex flex-col p-2 pt-3 gap-0.5 overflow-y-auto">
            <p className="px-3 mb-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Chat</p>
            <button
              onClick={() => { setActiveTabKey('group'); setMobileView('chat'); setMobileShowContent(true) }}
              className={cn(
                'flex items-center gap-2.5 min-h-[40px] rounded-xl px-3 text-sm font-medium transition-colors text-left',
                (activeTabKey === 'group' && mobileView === 'chat') || !mobileShowContent ? 'tab-btn-active' : 'tab-btn-inactive'
              )}
            >
              <Users className="h-4 w-4 shrink-0" />
              Team chat
            </button>

            <p className="px-3 mt-3 mb-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Direct Messages</p>
            {staff.map((person) => (
              <button
                key={person.id}
                onClick={() => { openDm(person.id, person.name); setMobileShowContent(true) }}
                className={cn(
                  'flex items-center gap-2.5 min-h-[40px] rounded-xl px-3 text-sm font-medium transition-colors text-left',
                  activeTabKey === `dm:${person.id}` ? 'tab-btn-active' : 'tab-btn-inactive'
                )}
              >
                <Avatar name={person.name} initials={person.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)} size={22} />
                <span className="flex-1 truncate">{person.name}</span>
                {unreadCounts[person.id] > 0 && (
                  <span className="rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCounts[person.id]}</span>
                )}
              </button>
            ))}

            <p className="px-3 mt-3 mb-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Boards</p>
            <button
              onClick={() => { setMobileView('bulletin'); setMobileShowContent(true) }}
              className={cn(
                'flex items-center gap-2.5 min-h-[40px] rounded-xl px-3 text-sm font-medium transition-colors text-left',
                mobileView === 'bulletin' && mobileShowContent ? 'tab-btn-active' : 'tab-btn-inactive'
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              Bulletin board
            </button>
            <button
              onClick={() => { setMobileView('deadlines'); setMobileShowContent(true) }}
              className={cn(
                'flex items-center gap-2.5 min-h-[40px] rounded-xl px-3 text-sm font-medium transition-colors text-left',
                mobileView === 'deadlines' && mobileShowContent ? 'tab-btn-active' : 'tab-btn-inactive'
              )}
            >
              <Clock className="h-4 w-4 shrink-0 text-orange" />
              Deadlines & Targets
            </button>
            <button
              onClick={() => { setMobileView('highlights'); setMobileShowContent(true) }}
              className={cn(
                'flex items-center gap-2.5 min-h-[40px] rounded-xl px-3 text-sm font-medium transition-colors text-left',
                mobileView === 'highlights' && mobileShowContent ? 'tab-btn-active' : 'tab-btn-inactive'
              )}
            >
              <Star className="h-4 w-4 shrink-0 text-blue" />
              Highlights
            </button>
          </nav>
        </div>

        <div className={cn(
          'flex-1 min-w-0 flex flex-col',
          !mobileShowContent && 'hidden lg:flex'
        )}>
          <button
            onClick={() => setMobileShowContent(false)}
            className="flex items-center gap-1 px-4 py-2 text-xs text-white/40 hover:text-white lg:hidden"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {/* Chat panel — always on desktop; on mobile only when chat is selected */}
          <div className={cn(
            'flex-1 min-h-0 flex flex-col',
            mobileView !== 'chat' && 'hidden lg:flex'
          )}>
            <div className="flex items-center gap-1 border-b border-white/10 px-2 overflow-x-auto shrink-0">
              {openTabs.map((tab) => {
                const key = tabKey(tab)
                const label = tab.type === 'group' ? 'Team chat' : tab.peerName
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTabKey(key)}
                    className={cn(
                      'flex items-center gap-1.5 shrink-0 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors',
                      activeTabKey === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                    )}
                  >
                    {label}
                    {tab.type === 'dm' && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); closeDm(tab.peerId) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); closeDm(tab.peerId) } }}
                        className="ml-1 text-white/30 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {activeTabKey === 'group' ? (
                <GroupChat currentUserId={currentUserId} />
              ) : activeDmTab && activeDmTab.type === 'dm' ? (
                <DirectChat
                  currentUserId={currentUserId}
                  peerId={activeDmTab.peerId}
                  peerName={activeDmTab.peerName}
                  onClose={() => closeDm(activeDmTab.peerId)}
                />
              ) : null}
            </div>
          </div>

          {mobileView === 'bulletin' ? (
            <div className="flex-1 min-h-0 flex flex-col lg:hidden">
              <PostsBoard board="bulletin" title="Bulletin Board" icon={<MessageSquare className="h-4 w-4 text-white/40" />} theme="neutral" />
            </div>
          ) : mobileView === 'deadlines' ? (
            <div className="flex-1 min-h-0 flex flex-col lg:hidden">
              <PostsBoard board="deadlines" title="Deadlines & Targets" icon={<Clock className="h-4 w-4 text-orange" />} theme="orange" showDueDate />
            </div>
          ) : mobileView === 'highlights' ? (
            <div className="flex-1 min-h-0 flex flex-col lg:hidden">
              <PostsBoard board="highlights" title="Highlights" icon={<Star className="h-4 w-4 text-blue" />} theme="blue" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="hidden lg:grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div
          className="flex flex-col rounded-2xl overflow-hidden border border-white/10 glass-card crisp-on-dark"
          style={{ height: '320px', ...BOARD_THEMES.neutral }}
        >
          <PostsBoard board="bulletin" title="Bulletin Board" icon={<MessageSquare className="h-4 w-4 text-white/40" />} theme="neutral" />
        </div>
        <div
          className="flex flex-col rounded-2xl overflow-hidden border border-orange/20"
          style={{ height: '320px', ...BOARD_THEMES.orange }}
        >
          <PostsBoard board="deadlines" title="Deadlines & Targets" icon={<Clock className="h-4 w-4 text-orange" />} theme="orange" showDueDate />
        </div>
        <div
          className="flex flex-col rounded-2xl overflow-hidden border border-blue/20"
          style={{ height: '320px', ...BOARD_THEMES.blue }}
        >
          <PostsBoard board="highlights" title="Highlights" icon={<Star className="h-4 w-4 text-blue" />} theme="blue" />
        </div>
      </div>

    </div>
  )
}
