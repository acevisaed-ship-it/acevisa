'use client'

import { useEffect, useState, useCallback } from 'react'
import { Pin, Send, Plus, X, ChevronLeft, Loader2, Trash2 } from 'lucide-react'
import { Avatar, timeAgo } from './TeamHub'

export const BOARD_THEMES: Record<'neutral' | 'orange' | 'blue', React.CSSProperties> = {
  neutral: {},
  orange: {
    background: 'linear-gradient(145deg, rgba(245,162,78,0.18) 0%, rgba(228,131,40,0.12) 55%, rgba(202,114,32,0.10) 100%)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  blue: {
    background: 'linear-gradient(145deg, rgba(53,165,224,0.18) 0%, rgba(32,131,185,0.12) 55%, rgba(23,111,160,0.10) 100%)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
}

type Post = {
  id: string
  author_id: string
  author_name: string
  title: string
  content: string
  pinned: boolean
  due_date?: string | null
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

function ComposePost({
  board,
  showDueDate,
  onClose,
  onCreated,
}: {
  board: string
  showDueDate?: boolean
  onClose: () => void
  onCreated: (post: Post) => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pinned, setPinned] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    const res = await fetch('/api/team/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        pinned,
        board,
        due_date: showDueDate && dueDate ? dueDate : undefined,
      }),
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
          {showDueDate && (
            <div>
              <label className="mb-1 block text-xs text-white/50">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input"
              />
            </div>
          )}
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

function PostThread({
  post,
  onBack,
  canRemove,
  onRemoved,
}: {
  post: Post
  onBack: () => void
  canRemove?: boolean
  onRemoved?: () => void
}) {
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/team/posts/${post.id}/replies`)
      .then((r) => r.json())
      .then((d) => setReplies(d.replies ?? []))
      .finally(() => setLoading(false))
  }, [post.id])

  async function handleRemove() {
    if (!canRemove || removing) return
    if (!confirm('Remove this post? Replies will be deleted too.')) return
    setRemoving(true)
    setRemoveError(null)
    const res = await fetch(`/api/team/posts/${post.id}`, { method: 'DELETE' })
    setRemoving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setRemoveError(data.error || 'Failed to remove post')
      return
    }
    onRemoved?.()
  }

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
        {canRemove && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/40 hover:bg-white/10 hover:text-orange disabled:opacity-50"
            aria-label="Remove post"
            title="Remove post"
          >
            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      {removeError && (
        <p className="px-4 py-2 text-xs text-red-400 border-b border-white/10">{removeError}</p>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl border border-white/10 glass-card p-4">
          <p className="text-sm text-white/80 whitespace-pre-wrap">{post.content}</p>
        </div>

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

type PostsBoardProps = {
  board: string
  title: string
  icon: React.ReactNode
  theme?: 'neutral' | 'orange' | 'blue'
  showDueDate?: boolean
  canRemovePosts?: boolean
}

export function PostsBoard({ board, title, icon, showDueDate, canRemovePosts = false }: PostsBoardProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [composing, setComposing] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    const res = await fetch(`/api/team/posts?board=${board}`)
    const data = await res.json()
    setPosts(data.posts ?? [])
    setLoading(false)
  }, [board])

  useEffect(() => { loadPosts() }, [loadPosts])

  async function handleRemovePost(postId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!canRemovePosts || removingId) return
    if (!confirm('Remove this post? Replies will be deleted too.')) return
    setRemovingId(postId)
    setRemoveError(null)
    const res = await fetch(`/api/team/posts/${postId}`, { method: 'DELETE' })
    setRemovingId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setRemoveError(data.error || 'Failed to remove post')
      return
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    if (selectedPost?.id === postId) setSelectedPost(null)
  }

  if (selectedPost) {
    return (
      <PostThread
        post={selectedPost}
        canRemove={canRemovePosts}
        onBack={() => { setSelectedPost(null); loadPosts() }}
        onRemoved={() => {
          setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id))
          setSelectedPost(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        {icon}
        <span className="text-sm font-semibold text-white flex-1">{title}</span>
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-3 py-1.5 text-xs font-bold text-white"
        >
          <Plus className="h-3 w-3" /> Post
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {removeError && (
          <p className="mb-3 text-xs text-red-400">{removeError}</p>
        )}
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
              <div
                key={post.id}
                className="relative w-full rounded-xl border border-white/10 glass-card p-4 hover:border-white/20 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setSelectedPost(post)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-2 mb-1 pr-10">
                    {post.pinned && <Pin className="h-3.5 w-3.5 text-orange shrink-0 mt-0.5" />}
                    <p className="text-sm font-semibold text-white flex-1">{post.title}</p>
                  </div>
                  <p className="text-xs text-white/50 line-clamp-2 mb-2">{post.content}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] text-white/30">{post.author_name} · {timeAgo(post.created_at)}</span>
                    {post.due_date && (
                      <span className="rounded-full bg-orange/20 px-2 py-0.5 text-[10px] font-bold text-orange">
                        Due {new Date(post.due_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {post.replyCount > 0 && (
                      <span className="text-[11px] text-blue-400">{post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}</span>
                    )}
                  </div>
                </button>
                {canRemovePosts && (
                  <button
                    type="button"
                    onClick={(e) => handleRemovePost(post.id, e)}
                    disabled={removingId === post.id}
                    className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/30 hover:bg-white/10 hover:text-orange disabled:opacity-50"
                    aria-label="Remove post"
                    title="Remove post"
                  >
                    {removingId === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {composing && (
        <ComposePost
          board={board}
          showDueDate={showDueDate}
          onClose={() => setComposing(false)}
          onCreated={(post) => { setPosts((prev) => [post, ...prev]); setComposing(false) }}
        />
      )}
    </div>
  )
}
