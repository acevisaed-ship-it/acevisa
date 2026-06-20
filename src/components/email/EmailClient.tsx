'use client'

import { useEffect, useState, useCallback } from 'react'
import { Inbox, Send, RefreshCw, Pencil, X, ChevronLeft, Loader2, Mail, MailOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmailSummary = {
  uid: number
  subject: string
  from: string
  date: string
  seen: boolean
  preview: string
}

type EmailDetail = {
  uid: number
  subject: string
  from: string
  to: string
  date: string
  html: string
  text: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })
}

function NotConnected() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <Mail className="h-12 w-12 text-white/20" />
      <div>
        <p className="text-white font-semibold">Email not connected</p>
        <p className="mt-1 text-sm text-white/50">
          Add your Bluehost credentials to <code className="text-orange">.env.local</code> to connect.
        </p>
      </div>
      <div className="rounded-xl glass-card border border-white/10 p-4 text-left text-xs font-mono text-white/60 w-full max-w-sm">
        <p>EMAIL_HOST=mail.acevisa.co</p>
        <p>EMAIL_PORT=993</p>
        <p>EMAIL_USER=info@acevisa.co</p>
        <p>EMAIL_PASSWORD=your_password</p>
        <p>EMAIL_FROM=info@acevisa.co</p>
      </div>
    </div>
  )
}

function ComposeModal({
  onClose,
  replyTo,
}: {
  onClose: () => void
  replyTo?: { to: string; subject: string; uid: number }
}) {
  const [to, setTo] = useState(replyTo?.to ?? '')
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    if (!to || !subject || !body) { setError('All fields required'); return }
    setSending(true)
    setError(null)
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text: body }),
    })
    const data = await res.json()
    setSending(false)
    if (!res.ok) { setError(data.error ?? 'Send failed'); return }
    setSent(true)
    setTimeout(onClose, 1500)
  }

  const inputCls = 'w-full min-h-[44px] rounded-xl px-3 py-2 text-sm outline-none glass-input'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4" onClick={onClose}>
      <div
        className="flex w-full flex-col dark-modal rounded-t-2xl p-6 sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">{replyTo ? 'Reply' : 'New Message'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {sent ? (
          <p className="py-8 text-center text-sm text-green">✓ Sent successfully</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-white/50">To</label>
              <input value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} placeholder="recipient@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Subject" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none glass-input resize-none"
                placeholder="Write your message…"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-full bg-grad-blue crisp-on-dark text-sm font-bold text-white disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EmailDetailView({
  uid,
  folder,
  onBack,
  onReply,
}: {
  uid: number
  folder: string
  onBack: () => void
  onReply: (detail: EmailDetail) => void
}) {
  const [detail, setDetail] = useState<EmailDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/email/message?uid=${uid}&folder=${folder}`)
      .then((r) => r.json())
      .then(setDetail)
      .finally(() => setLoading(false))
  }, [uid, folder])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-white/30" />
    </div>
  )

  if (!detail) return <p className="p-6 text-sm text-white/40">Failed to load email.</p>

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <button onClick={onBack} className="text-white/40 hover:text-white lg:hidden">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">{detail.subject}</h2>
          <p className="text-xs text-white/40">{timeAgo(detail.date)}</p>
        </div>
        <button
          onClick={() => onReply(detail)}
          className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white"
        >
          <Send className="h-3 w-3" /> Reply
        </button>
      </div>

      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <p className="text-xs text-white/50"><span className="text-white/30">From:</span> {detail.from}</p>
        <p className="text-xs text-white/50"><span className="text-white/30">To:</span> {detail.to}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {detail.html ? (
          <iframe
            srcDoc={detail.html}
            className="w-full min-h-[400px] rounded-xl bg-white"
            sandbox="allow-same-origin"
            title="Email content"
          />
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-white/70 font-sans">{detail.text}</pre>
        )}
      </div>
    </div>
  )
}

export function EmailClient() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [emails, setEmails] = useState<EmailSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [folder, setFolder] = useState('INBOX')
  const [selectedUid, setSelectedUid] = useState<number | null>(null)
  const [composing, setComposing] = useState(false)
  const [replyTo, setReplyTo] = useState<EmailDetail | null>(null)

  const loadInbox = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`/api/email/inbox?folder=${folder}`)
      const data = await res.json()
      setConnected(data.connected)
      setEmails(data.emails ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [folder])

  useEffect(() => { loadInbox() }, [loadInbox])

  const unread = emails.filter((e) => !e.seen).length

  const FOLDERS = [
    { id: 'INBOX', label: 'Inbox', icon: Inbox },
    { id: 'Sent', label: 'Sent', icon: Send },
  ]

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden border border-white/10 glass-card crisp-on-dark">
      {/* Left sidebar — folders */}
      <div className="hidden w-48 shrink-0 flex-col border-r border-white/10 p-3 gap-1 lg:flex">
        <button
          onClick={() => { setComposing(true); setReplyTo(null) }}
          className="flex items-center gap-2 min-h-[40px] rounded-xl bg-grad-blue crisp-on-dark px-3 text-sm font-bold text-white mb-3"
        >
          <Pencil className="h-4 w-4" /> Compose
        </button>

        {FOLDERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setFolder(id); setSelectedUid(null) }}
            className={cn(
              'flex items-center gap-2.5 min-h-[40px] rounded-xl px-3 text-sm font-medium transition-colors',
              folder === id ? 'tab-btn-active' : 'tab-btn-inactive'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {id === 'INBOX' && unread > 0 && (
              <span className="rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => loadInbox(true)}
          disabled={refreshing}
          className="mt-auto flex items-center gap-2 min-h-[40px] rounded-xl px-3 text-sm text-white/40 hover:text-white"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Email list */}
      <div className={cn(
        'flex w-full flex-col border-r border-white/10 lg:w-80 lg:shrink-0',
        selectedUid !== null && 'hidden lg:flex'
      )}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
          <span className="text-sm font-semibold text-white">{folder === 'INBOX' ? 'Inbox' : 'Sent'}</span>
          <button
            onClick={() => { setComposing(true); setReplyTo(null) }}
            className="lg:hidden flex items-center gap-1.5 rounded-full bg-grad-blue crisp-on-dark px-3 py-1.5 text-xs font-bold text-white"
          >
            <Pencil className="h-3 w-3" /> Compose
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : connected === false ? (
          <NotConnected />
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <MailOpen className="h-8 w-8 text-white/20" />
            <p className="text-sm text-white/40">No emails</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {emails.map((email) => (
              <button
                key={email.uid}
                onClick={() => setSelectedUid(email.uid)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-white/5 transition-colors',
                  selectedUid === email.uid && 'bg-white/8',
                  !email.seen && 'bg-white/4'
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  {!email.seen && <span className="h-2 w-2 rounded-full bg-orange shrink-0" />}
                  <p className={cn('truncate text-sm flex-1', !email.seen ? 'font-semibold text-white' : 'text-white/70')}>
                    {email.from.split('<')[0].trim() || email.from}
                  </p>
                  <span className="text-[10px] text-white/30 shrink-0">{timeAgo(email.date)}</span>
                </div>
                <p className="truncate text-xs text-white/60">{email.subject}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Email detail */}
      <div className={cn(
        'flex-1 min-w-0',
        selectedUid === null && 'hidden lg:flex lg:items-center lg:justify-center'
      )}>
        {selectedUid !== null ? (
          <EmailDetailView
            uid={selectedUid}
            folder={folder}
            onBack={() => setSelectedUid(null)}
            onReply={(d) => { setReplyTo(d); setComposing(true) }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center p-8">
            <Mail className="h-10 w-10 text-white/10" />
            <p className="text-sm text-white/30">Select an email to read</p>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {composing && (
        <ComposeModal
          onClose={() => { setComposing(false); setReplyTo(null) }}
          replyTo={replyTo ? {
            to: replyTo.from,
            subject: replyTo.subject,
            uid: replyTo.uid,
          } : undefined}
        />
      )}
    </div>
  )
}
