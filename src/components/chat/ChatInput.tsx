'use client'

import {
  type FormEvent, forwardRef, useRef, useState, useEffect,
} from 'react'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import {
  Paperclip, Mic, Square, X,
  FileText, FileImage, FileArchive, File, Camera, Music, Smile,
} from 'lucide-react'
import type { ChatAttachmentType } from '@/types'

// ── Accept lists ────────────────────────────────────────────────────────────
const ACCEPT_GALLERY  = 'image/jpeg,image/jpg,image/png,image/webp,image/gif'
const ACCEPT_DOCUMENT = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const ACCEPT_AUDIO    = 'audio/*'
const ACCEPT_ANY      = '*/*'

function getAttachType(mime: string): ChatAttachmentType {
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('zip') || mime.includes('rar')) return 'archive'
  return 'document'
}

function AttachIconSmall({ type }: { type: ChatAttachmentType }) {
  const cls = 'h-4 w-4'
  if (type === 'image')   return <FileImage   className={cls} />
  if (type === 'pdf')     return <FileText     className={cls} />
  if (type === 'archive') return <FileArchive  className={cls} />
  if (type === 'audio')   return <Music        className={cls} />
  return <File className={cls} />
}

// ── Attachment options ──────────────────────────────────────────────────────
type SheetOption = {
  label: string
  icon: React.ReactNode
  accept: string
  capture?: 'user' | 'environment'
}

const SHEET_OPTIONS: SheetOption[] = [
  { label: 'Camera',   icon: <Camera    className="h-7 w-7" />, accept: 'image/*', capture: 'environment' },
  { label: 'Gallery',  icon: <FileImage className="h-7 w-7" />, accept: ACCEPT_GALLERY },
  { label: 'Document', icon: <FileText  className="h-7 w-7" />, accept: ACCEPT_DOCUMENT },
  { label: 'Audio',    icon: <Music     className="h-7 w-7" />, accept: ACCEPT_AUDIO },
  { label: 'File',     icon: <File      className="h-7 w-7" />, accept: ACCEPT_ANY },
]

// ── Emoji data ──────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  {
    label: '😊',
    name: 'Smileys',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😋','😎','🤩','🥳','😏','😒','😔','😢','😭','😤','😠','🤯','😳','😱','🤗','🤔','🤫','😶','😐','😬','🙄','😴','🥱','😷','🤧'],
  },
  {
    label: '👋',
    name: 'Hands',
    emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','👍','👎','✊','👊','🤛','🤜','👏','🙌','🤝','🙏','💪','✍️','💅'],
  },
  {
    label: '❤️',
    name: 'Hearts',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','❤️‍🔥','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'],
  },
  {
    label: '🎉',
    name: 'Fun',
    emojis: ['🎉','🎊','🥳','🎈','🎁','🎀','🏆','🥇','🎯','🎮','🎲','🎭','🎨','🎬','🎤','🎧','🎸','🎹','🥁','🎷','✨','💫','⭐','🌟','🔥','💥','🎆','🎇','🪄','🎩'],
  },
  {
    label: '🌸',
    name: 'Nature',
    emojis: ['🌸','🌺','🌻','🌹','🌷','🌼','💐','🍀','🌿','🌱','🌊','🌈','☀️','🌙','⭐','❄️','☃️','🌬️','🔥','💧','🍎','🍊','🍋','🍇','🍓','🍕','🍔','🍟','☕','🍵'],
  },
]

// ── Shared panel shell ──────────────────────────────────────────────────────
const ORANGE = 'linear-gradient(145deg, #f5a24e 0%, #E48328 55%, #ca7220 100%)'
const PANEL_BG: React.CSSProperties = {
  background: 'rgba(4,22,20,0.97)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
}

// ── Props ───────────────────────────────────────────────────────────────────
type Props = {
  clientId: string
  value: string
  onChange: (value: string) => void
  onSend?: (message: string) => void
  onAttachmentSent?: (studentMsg: unknown, aiMsg: unknown) => void
  onAiPendingChange?: (pending: boolean) => void
  disabled?: boolean
  clientLanguage?: string | null
}

export const ChatInput = forwardRef<HTMLInputElement, Props>(function ChatInput(
  { clientId, value, onChange, onSend, onAttachmentSent, onAiPendingChange, disabled = false, clientLanguage },
  ref,
) {
  // ── Panel state ─────────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [emojiOpen, setEmojiOpen]     = useState(false)
  const [emojiTab, setEmojiTab]       = useState(0)

  // ── File / upload state ─────────────────────────────────────────────────
  const [pendingFile, setPendingFile]   = useState<File | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [uploadError, setUploadError]   = useState<string | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  const [voiceUploading, setVoiceUploading] = useState(false)

  const { recording, seconds: recordSeconds, start: startRecording, stop: stopRecording, cancel: cancelRecording } =
    useVoiceRecorder({
      language: clientLanguage,
      onRecorded: async (blob, mimeType, ext, transcript) => {
        setVoiceUploading(true)
        onAiPendingChange?.(true)
        try {
          const fd = new FormData()
          fd.append('clientId', clientId)
          fd.append('mimeType', mimeType)
          fd.append('audio', blob, `voice-${Date.now()}.${ext}`)
          if (transcript) fd.append('transcript', transcript)
          const res = await fetch('/api/chat/voice', { method: 'POST', body: fd })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Upload failed')
          onAttachmentSent?.(data.studentMessage, data.aiMessage)
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Voice upload failed')
        } finally {
          setVoiceUploading(false)
          onAiPendingChange?.(false)
        }
      },
      onError: (message) => setUploadError(message),
    })

  // Focus input on mount (autoFocus alone is suppressed by some mobile browsers)
  useEffect(() => {
    setTimeout(() => (ref as React.RefObject<HTMLInputElement>)?.current?.focus(), 150)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const closeAll = () => {
    setSheetOpen(false)
    setEmojiOpen(false)
    setTimeout(() => (ref as React.RefObject<HTMLInputElement>)?.current?.focus(), 50)
  }

  // ── File selection ───────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setUploadError('File must be 10 MB or less'); return }
    setUploadError(null); setPendingFile(file); closeAll(); e.target.value = ''
  }

  const handleUpload = async () => {
    if (!pendingFile) return
    setUploading(true); setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('clientId', clientId); fd.append('file', pendingFile)
      const res  = await fetch('/api/chat/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onAttachmentSent?.(data.studentMessage, data.aiMessage)
      setPendingFile(null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally { setUploading(false) }
  }

  // ── Emoji insert ────────────────────────────────────────────────────────
  const insertEmoji = (emoji: string) => {
    onChange(value + emoji)
    ;(ref as React.RefObject<HTMLInputElement>)?.current?.focus()
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (pendingFile) { handleUpload(); return }
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend?.(trimmed)
  }

  const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const busy = disabled || uploading || voiceUploading
  const anyPanelOpen = sheetOpen || emojiOpen

  return (
    <>
      {/* ── Shared backdrop ───────────────────────────────────────────── */}
      {anyPanelOpen && (
        <div className="fixed inset-0 z-40" onClick={closeAll} aria-hidden="true" />
      )}

      {/* ── Attachment panel ──────────────────────────────────────────── */}
      {sheetOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
          style={PANEL_BG}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-white/20" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <span className="text-xs font-bold uppercase tracking-widest text-white/40">Attach</span>
            <button type="button" onClick={() => setSheetOpen(false)} className="text-white/30 hover:text-white/70">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Option cards */}
          <div className="grid grid-cols-5 gap-2.5 px-4 pb-4">
            {SHEET_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => fileRefs.current[i]?.click()}
                className="flex flex-col items-center gap-2 rounded-2xl py-4 transition-opacity active:opacity-80"
                style={{ background: ORANGE }}
              >
                <span className="text-white">{opt.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-white">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Safe area */}
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />

          {/* Hidden file inputs */}
          {SHEET_OPTIONS.map((opt, i) => (
            <input
              key={opt.label}
              ref={(el) => { fileRefs.current[i] = el }}
              type="file"
              accept={opt.accept}
              {...(opt.capture ? { capture: opt.capture } : {})}
              className="hidden"
              onChange={handleFileChange}
            />
          ))}
        </div>
      )}

      {/* ── Emoji picker panel ────────────────────────────────────────── */}
      {emojiOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
          style={PANEL_BG}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-white/20" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <span className="text-xs font-bold uppercase tracking-widest text-white/40">Emoji</span>
            <button type="button" onClick={() => setEmojiOpen(false)} className="text-white/30 hover:text-white/70">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Category tabs */}
          <div className="scrollbar-hidden flex gap-2 overflow-x-auto px-4 pb-3">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setEmojiTab(i)}
                className="flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold transition-opacity active:opacity-80"
                style={
                  emojiTab === i
                    ? { background: ORANGE, color: 'white' }
                    : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }
                }
              >
                <span>{cat.label}</span>
                <span className="hidden sm:inline">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div
            className="grid grid-cols-8 gap-1 overflow-y-auto px-4 pb-2"
            style={{ maxHeight: '200px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            {EMOJI_CATEGORIES[emojiTab].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="flex items-center justify-center rounded-xl py-2 text-2xl transition-colors hover:bg-white/10 active:bg-white/20"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Safe area */}
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
        </div>
      )}

      {/* ── Input bar ─────────────────────────────────────────────────── */}
      <div
        className="mx-3 mb-3 shrink-0 overflow-hidden rounded-2xl pb-[env(safe-area-inset-bottom,0px)]"
        style={{ background: 'rgba(4,80,71,0.6)', backdropFilter: 'blur(12px)' }}
      >
        {/* Pending file preview */}
        {pendingFile && (
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="text-white/50"><AttachIconSmall type={getAttachType(pendingFile.type)} /></span>
            <span className="min-w-0 flex-1 truncate text-xs text-white/70">{pendingFile.name}</span>
            <button
              type="button"
              onClick={() => { setPendingFile(null); setUploadError(null) }}
              className="shrink-0 text-white/30 hover:text-white"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error */}
        {uploadError && <p className="px-4 pb-1 text-xs text-orange">{uploadError}</p>}

        {/* Recording indicator */}
        {recording && (
          <div className="flex items-center gap-2 px-4 py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <span className="text-xs font-medium text-red-300">Recording {formatSeconds(recordSeconds)}</span>
            <span className="text-xs text-white/30">— Release to send</span>
          </div>
        )}

        {/* Voice uploading */}
        {voiceUploading && (
          <div className="flex items-center gap-2 px-4 py-1.5">
            <svg className="h-3 w-3 animate-spin text-white/50" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs text-white/50">Transcribing voice note…</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3">
          {/* Attach */}
          <button
            type="button"
            onClick={() => { setEmojiOpen(false); setSheetOpen((v) => !v) }}
            disabled={busy || recording}
            aria-label="Attach file"
            className={`shrink-0 transition-colors disabled:opacity-20 ${sheetOpen ? 'text-orange' : 'text-white/30 hover:text-white/70'}`}
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Emoji */}
          <button
            type="button"
            onClick={() => { setSheetOpen(false); setEmojiOpen((v) => !v) }}
            disabled={busy || recording}
            aria-label="Emoji picker"
            className={`shrink-0 transition-colors disabled:opacity-20 ${emojiOpen ? 'text-orange' : 'text-white/30 hover:text-white/70'}`}
          >
            <Smile className="h-5 w-5" />
          </button>

          {/* Text input */}
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              recording       ? 'Recording…'
              : voiceUploading ? 'Transcribing voice note…'
              : pendingFile    ? 'Add a caption (optional)'
              : 'Type your message…'
            }
            disabled={busy || recording}
            autoFocus
            autoComplete="off"
            className="min-h-[44px] min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
          />

          {/* Mic */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              startRecording()
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId)
              stopRecording()
            }}
            onPointerCancel={() => cancelRecording()}
            disabled={busy || !!pendingFile}
            aria-label={recording ? 'Stop recording' : 'Hold to record voice note'}
            className={`shrink-0 transition-all disabled:opacity-20 ${recording ? 'scale-110 text-red-400' : 'text-white/30 hover:text-white/70'}`}
          >
            {recording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Send */}
          <button
            type="submit"
            disabled={busy || recording || (!pendingFile && !value.trim())}
            aria-label={pendingFile ? (uploading ? 'Uploading…' : 'Send file') : 'Send message'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all hover:brightness-110 disabled:opacity-30"
            style={{ background: 'var(--grad-green)' }}
          >
            {uploading ? (
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[#0A3F3A]" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </>
  )
})
