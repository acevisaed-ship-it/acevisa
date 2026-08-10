'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Inbox, Send, RefreshCw, Pencil, X, ChevronLeft, Loader2, Mail, MailOpen, Paperclip, Trash2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmailSummary = {
  uid: number
  subject: string
  from: string
  date: string
  seen: boolean
  preview: string
}

type EmailAttachment = {
  index: number
  filename: string
  contentType: string
  size: number
  contentId: string | null
  inline: boolean
}

type EmailDetail = {
  uid: number
  subject: string
  from: string
  to: string
  cc?: string
  date: string
  html: string
  text: string
  attachments?: EmailAttachment[]
  error?: string
}

function formatBytes(n: number) {
  if (!n || n < 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
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

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function wrapEmailHtml(html: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><base target="_blank"/><style>
    body{margin:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.5;color:#111;background:#fff;word-wrap:break-word;}
    img{max-width:100%;height:auto;}
    a{color:#1a56db;}
    pre{white-space:pre-wrap;}
  </style></head><body>${html}</body></html>`
}

function NotConnected({ error, reason }: { error?: string | null; reason?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <Mail className="h-12 w-12 text-white/20" />
      <div>
        <p className="text-white font-semibold">Email not connected</p>
        <p className="mt-1 text-sm text-white/50">
          {reason === 'no_config'
            ? 'Email credentials are not configured for this account.'
            : error
              ? 'Could not reach the mail server. See details below.'
              : 'Add your Bluehost credentials to connect the shared mailbox.'}
        </p>
      </div>
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left text-xs text-red-200 w-full max-w-md">
          {error}
        </div>
      )}
      {reason === 'no_config' && (
        <div className="rounded-xl glass-card border border-white/10 p-4 text-left text-xs font-mono text-white/60 w-full max-w-sm">
          <p>EMAIL_HOST=box2422.bluehost.com</p>
          <p>EMAIL_PORT=993</p>
          <p>EMAIL_USER=admin@aceyourvisa.com</p>
          <p>EMAIL_PASSWORD=your_password</p>
          <p>EMAIL_FROM=admin@aceyourvisa.com</p>
        </div>
      )}
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
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleAt, setScheduleAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    return toLocalInputValue(d)
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [scheduledMsg, setScheduledMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | null) {
    if (!files) return
    setAttachments((prev) => [...prev, ...Array.from(files)])
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSend() {
    if (!to || !subject || !body) { setError('To, subject, and message are required'); return }
    if (scheduleEnabled && attachments.length) {
      setError('Scheduled emails cannot include attachments yet. Send now, or remove attachments.')
      return
    }
    setSending(true)
    setError(null)

    const formData = new FormData()
    formData.append('to', to)
    if (cc.trim()) formData.append('cc', cc)
    if (bcc.trim()) formData.append('bcc', bcc)
    formData.append('subject', subject)
    formData.append('text', body)
    if (replyTo) formData.append('replyTo', String(replyTo.uid))
    if (scheduleEnabled && scheduleAt) {
      formData.append('scheduleAt', new Date(scheduleAt).toISOString())
    }
    attachments.forEach((f) => formData.append('attachments', f))

    const res = await fetch('/api/email/send', { method: 'POST', body: formData })
    const data = await res.json()
    setSending(false)
    if (!res.ok) { setError(data.error ?? 'Send failed'); return }
    if (data.scheduled) {
      setScheduledMsg(`Scheduled for ${new Date(data.sendAt).toLocaleString()}`)
    }
    setSent(true)
    setTimeout(onClose, 1600)
  }

  const inputCls = 'w-full min-h-[44px] rounded-xl px-3 py-2 text-sm outline-none glass-input'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4" onClick={onClose}>
      <div
        className="flex w-full max-h-[90vh] flex-col overflow-y-auto dark-modal rounded-t-2xl p-6 sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">{replyTo ? 'Reply' : 'New Message'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {sent ? (
          <p className="py-8 text-center text-sm text-green">
            {scheduledMsg ? `✓ ${scheduledMsg}` : '✓ Sent successfully'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs text-white/50">To</label>
                {!showCcBcc && (
                  <button
                    type="button"
                    onClick={() => setShowCcBcc(true)}
                    className="text-[11px] text-white/40 hover:text-white/70"
                  >
                    Cc / Bcc
                  </button>
                )}
              </div>
              <input value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} placeholder="recipient@example.com" />
            </div>

            {showCcBcc && (
              <>
                <div>
                  <label className="mb-1 block text-xs text-white/50">Cc</label>
                  <input value={cc} onChange={(e) => setCc(e.target.value)} className={inputCls} placeholder="cc@example.com" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/50">Bcc</label>
                  <input value={bcc} onChange={(e) => setBcc(e.target.value)} className={inputCls} placeholder="bcc@example.com" />
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-xs text-white/50">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Subject" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none glass-input resize-none"
                placeholder="Write your message…"
              />
            </div>

            <div className="rounded-xl border border-white/10 p-3">
              <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="rounded border-white/30"
                />
                <Clock className="h-3.5 w-3.5" />
                Schedule send
              </label>
              {scheduleEnabled && (
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className={cn(inputCls, 'mt-2')}
                />
              )}
            </div>

            <div>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <Paperclip className="h-3.5 w-3.5" /> Add attachment
              </button>
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attachments.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60">
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="shrink-0 text-white/30">{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => removeAttachment(i)} className="text-white/30 hover:text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-full bg-grad-blue crisp-on-dark text-sm font-bold text-white disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : scheduleEnabled ? <Clock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {sending
                ? (scheduleEnabled ? 'Scheduling…' : 'Sending…')
                : scheduleEnabled
                  ? 'Schedule send'
                  : `Send${attachments.length ? ` (${attachments.length} attachment${attachments.length > 1 ? 's' : ''})` : ''}`}
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
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setDetail(null)
    fetch(`/api/email/message?uid=${uid}&folder=${folder}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok || data.error) {
          setError(data.error ?? 'Failed to load email')
          return
        }
        setDetail(data)
      })
      .catch(() => setError('Failed to load email'))
      .finally(() => setLoading(false))
  }, [uid, folder])

  function onIframeLoad() {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument?.body) return
    const h = iframe.contentDocument.body.scrollHeight
    iframe.style.height = `${Math.max(320, Math.min(h + 32, 2000))}px`
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-white/30" />
    </div>
  )

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <p className="text-sm text-white/50">{error ?? 'Failed to load email.'}</p>
        <button onClick={onBack} className="text-xs text-white/40 hover:text-white lg:hidden">Back</button>
      </div>
    )
  }

  const hasHtml = Boolean(detail.html?.trim())
  const hasText = Boolean(detail.text?.trim())
  // Inline CID images are embedded into the HTML as data URLs; list the rest for download.
  // Also list oversized inline parts that were too large to embed.
  const listedAttachments = (detail.attachments ?? []).filter(
    (a) => !a.inline || a.size > 1.5 * 1024 * 1024,
  )

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

      <div className="px-4 py-3 border-b border-white/5 shrink-0 space-y-1">
        <p className="text-xs text-white/50"><span className="text-white/30">From:</span> {detail.from}</p>
        <p className="text-xs text-white/50"><span className="text-white/30">To:</span> {detail.to}</p>
        {detail.cc ? (
          <p className="text-xs text-white/50"><span className="text-white/30">Cc:</span> {detail.cc}</p>
        ) : null}
        {listedAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {listedAttachments.map((att) => (
              <a
                key={att.index}
                href={`/api/email/attachment?uid=${detail.uid}&folder=${encodeURIComponent(folder)}&index=${att.index}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[180px] truncate">{att.filename}</span>
                {att.size > 0 && (
                  <span className="text-white/35">{formatBytes(att.size)}</span>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {hasHtml ? (
          <iframe
            ref={iframeRef}
            srcDoc={wrapEmailHtml(detail.html)}
            className="w-full min-h-[320px] rounded-xl bg-white border border-white/10"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            title="Email content"
            onLoad={onIframeLoad}
          />
        ) : hasText ? (
          <pre className="whitespace-pre-wrap text-sm text-white/70 font-sans">{detail.text}</pre>
        ) : (
          <p className="text-sm text-white/40">This message has no readable text or HTML body.</p>
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
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionReason, setConnectionReason] = useState<string | null>(null)

  const loadInbox = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`/api/email/inbox?folder=${folder}`)
      const data = await res.json()
      setConnected(data.connected)
      setEmails(data.emails ?? [])
      setConnectionError(data.error ?? (res.status === 401 ? 'Please log in again.' : null))
      setConnectionReason(data.reason ?? null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [folder])

  useEffect(() => { loadInbox() }, [loadInbox])

  const unread = emails.filter((e) => !e.seen).length

  const FOLDERS = [
    { id: 'INBOX', label: 'Inbox', icon: Inbox },
    { id: 'INBOX.Sent', label: 'Sent', icon: Send },
  ]

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden border border-white/10 glass-card crisp-on-dark">
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
          <NotConnected error={connectionError} reason={connectionReason} />
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

      {composing && (
        <ComposeModal
          onClose={() => { setComposing(false); setReplyTo(null); loadInbox(true) }}
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
