'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Pin, MessageSquare, Users, Send, Plus, X, ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: string
  sender_id: string
  sender_name: string
  sender_initials: string
  content: string
  created_at: string
}

type Post = {
  id: string
  author_id: string
  author_name: string
  title: string
  content: string
  pinned: boolean
  created_at: string
  replyCount: number
}

type Reply = {
  id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })
}

const AVATAR_COLORS = [
  'bg-blue-500/20 text-blue-300',
  'bg-green/20 text-green',
  'bg-orange/20 text-orange',
  'bg-purple-500/20 text-purple-300',
  'bg-pink-500/20 text-pink-300',
]

function avatarColor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[hash]
}

function Avatar({ name, initials, size = 32 }: { name: string; initials: string; size?: number }) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full text-xs font-semibold', avatarColor(name))}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

// ── Compose post modal ────────────────────────────────────────────────────────
function ComposePost({ onClose, onCreated }: { onClose: () => void; onCreated: (post: Post) => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pinned, setPinned] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    const res = await fetch('/api/team/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, pinned }),
    })
    const data = await res.json()
    setSending(false)
    if (!res.ok) { setError(data.error); return }
    onCreated({ ...data.post, replyCount: 0 })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4" onClick={onClose}>
      <div className="flex w-full flex-col dark-modal rounded-t-2xl p-6 sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">New Post</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
          />
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Write your post…"
            className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none glass-input"
          />
          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-orange" />
            Pin this post
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-grad-blue crisp-on-dark text-sm font-bold text-white disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {sending ? 'Posting…' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Post thread view ──────────────────────────────────────────────────────────
function PostThread({ post, onBack }: { post: Post; onBack: () => void }) {
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch(`/api/team/posts/${post.id}/replies`)
      .then((r) => r.json())
      .then((d) => setReplies(d.replies ?? []))
      .finally(() => setLoading(false))
  }, [post.id])

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    const res = await fetch(`/api/team/posts/${post.id}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    const data = await res.json()
    setSending(false)
    if (res.ok) {
      setReplies((prev) => [...prev, data.reply])
      setContent('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <button onClick={onBack} className="text-white/40 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">{post.title}</h2>
          <p className="text-xs text-white/40">{post.author_name} · {timeAgo(post.created_at)}</p>
        </div>
        {post.pinned && <Pin className="h-4 w-4 text-orange shrink-0" />}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Original post */}
        <div className="rounded-xl border border-white/10 glass-card p-4">
          <p className="text-sm text-white/80 whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Replies */}
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>
        ) : replies.length === 0 ? (
          <p className="text-center text-xs text-white/30 py-4">No replies yet. Be the first.</p>
        ) : (
          replies.map((r) => (
            <div key={r.id} className="flex gap-3">
              <Avatar name={r.author_name} initials={r.author_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)} size={30} />
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-white">{r.author_name}</span>
                  <span className="text-[10px] text-white/30">{timeAgo(r.created_at)}</span>
                </div>
                <p className="text-sm text-white/70 whitespace-pre-wrap">{r.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleReply} className="flex gap-2 border-t border-white/10 p-3 shrink-0">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a reply…"
          className="flex-1 min-h-[40px] rounded-xl px-3 text-sm outline-none glass-input"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-grad-blue crisp-on-dark disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-white" />}
        </button>
      </form>
    </div>
  )
}

// ── Bulletin board ────────────────────────────────────────────────────────────
function BulletinBoard() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [composing, setComposing] = useState(false)

  const loadPosts = useCallback(async () => {
    const res = await fetch('/api/team/posts')
    const data = await res.json()
    setPosts(data.posts ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadPosts() }, [loadPosts])

  if (selectedPost) {
    return <PostThread post={selectedPost} onBack={() => { setSelectedPost(null); loadPosts() }} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <MessageSquare className="h-4 w-4 text-white/40" />
        <span className="text-sm font-semibold text-white flex-1">Bulletin Board</span>
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-3 py-1.5 text-xs font-bold text-white"
        >
          <Plus className="h-3 w-3" /> Post
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Pin className="h-8 w-8 text-white/10" />
            <p className="text-sm text-white/30">No posts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="w-full text-left rounded-xl border border-white/10 glass-card p-4 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start gap-2 mb-1">
                  {post.pinned && <Pin className="h-3.5 w-3.5 text-orange shrink-0 mt-0.5" />}
                  <p className="text-sm font-semibold text-white flex-1">{post.title}</p>
                </div>
                <p className="text-xs text-white/50 line-clamp-2 mb-2">{post.content}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/30">{post.author_name} · {timeAgo(post.created_at)}</span>
                  {post.replyCount > 0 && (
                    <span className="text-[11px] text-blue-400">{post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {composing && (
        <ComposePost
          onClose={() => setComposing(false)}
          onCreated={(post) => { setPosts((prev) => [post, ...prev]); setComposing(false) }}
        />
      )}
    </div>
  )
}

// ── Group chat ────────────────────────────────────────────────────────────────
function GroupChat({ currentUserId }: { currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const res = await fetch('/api/team/messages')
    const data = await res.json()
    setMessages(data.messages ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadMessages() }, [loadMessages])

  // Supabase realtime (requires: alter publication supabase_realtime add table team_messages)
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

  // Polling every 3s — replaces full list, keeps any pending optimistic messages
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <Users className="h-4 w-4 text-white/40" />
        <span className="text-sm font-semibold text-white flex-1">Team chat</span>
        <span className="text-xs text-white/30">All members</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            return (
              <div key={msg.id} className={cn('flex items-end gap-2', isMine && 'flex-row-reverse')}>
                {!isMine && (
                  <Avatar name={msg.sender_name} initials={msg.sender_initials} size={28} />
                )}
                <div className={cn('max-w-[72%]', isMine && 'items-end flex flex-col')}>
                  {!isMine && (
                    <p className="mb-1 ml-1 text-[11px] text-white/40">{msg.sender_name}</p>
                  )}
                  <div className={cn(
                    'rounded-2xl px-3 py-2 text-sm',
                    isMine
                      ? 'bg-blue-600/40 text-white rounded-br-sm'
                      : 'glass-card border border-white/10 text-white/80 rounded-bl-sm'
                  )}>
                    {msg.content}
                  </div>
                  <p className="mt-0.5 text-[10px] text-white/20 px-1">{timeAgo(msg.created_at)}</p>
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

// ── Main TeamHub ──────────────────────────────────────────────────────────────
type View = 'chat' | 'bulletin'

export function TeamHub({ currentUserId }: { currentUserId: string }) {
  const [view, setView] = useState<View>('chat')
  const [mobileShowContent, setMobileShowContent] = useState(false)

  const navItems: { id: View; label: string; icon: typeof Users }[] = [
    { id: 'chat', label: 'Team chat', icon: Users },
    { id: 'bulletin', label: 'Bulletin board', icon: MessageSquare },
  ]

  return (
    <div className="flex h-[calc(100vh-100px)] gap-0 rounded-2xl overflow-hidden border border-white/10 glass-card crisp-on-dark">
      {/* Sidebar */}
      <div className={cn(
        'flex w-full flex-col border-r border-white/10 lg:w-52 lg:shrink-0',
        mobileShowContent && 'hidden lg:flex'
      )}>
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Team Hub</p>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setView(id); setMobileShowContent(true) }}
              className={cn(
                'flex items-center gap-3 min-h-[44px] rounded-xl px-3 text-sm font-medium transition-colors text-left',
                view === id ? 'tab-btn-active' : 'tab-btn-inactive'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div className={cn(
        'flex-1 min-w-0',
        !mobileShowContent && 'hidden lg:flex lg:flex-col'
      )}>
        {/* Mobile back */}
        <button
          onClick={() => setMobileShowContent(false)}
          className="flex items-center gap-1 px-4 py-2 text-xs text-white/40 hover:text-white lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex-1 flex flex-col h-full">
          {view === 'chat' && <GroupChat currentUserId={currentUserId} />}
          {view === 'bulletin' && <BulletinBoard />}
        </div>
      </div>
    </div>
  )
}
