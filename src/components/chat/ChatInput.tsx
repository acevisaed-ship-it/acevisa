'use client'

import {
  type FormEvent, forwardRef, useRef, useState, useCallback, useEffect,
} from 'react'
import { Paperclip, Mic, Square, X, FileText, FileImage, FileArchive, File } from 'lucide-react'
import type { ChatAttachmentType } from '@/types'

const ACCEPTED = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed',
].join(',')

function getAttachType(mime: string): ChatAttachmentType {
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.includes('zip') || mime.includes('rar')) return 'archive'
  return 'document'
}

function AttachIcon({ type }: { type: ChatAttachmentType }) {
  const cls = 'h-4 w-4'
  if (type === 'image') return <FileImage className={cls} />
  if (type === 'pdf') return <FileText className={cls} />
  if (type === 'archive') return <FileArchive className={cls} />
  return <File className={cls} />
}

type Props = {
  clientId: string
  value: string
  onChange: (value: string) => void
  onSend?: (message: string) => void
  onAttachmentSent?: (studentMsg: unknown, aiMsg: unknown) => void
  disabled?: boolean
}

export const ChatInput = forwardRef<HTMLInputElement, Props>(function ChatInput(
  { clientId, value, onChange, onSend, onAttachmentSent, disabled = false },
  ref,
) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // ── Real voice recording (MediaRecorder) ──────────────────────────────
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [voiceUploading, setVoiceUploading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clear timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' })
        if (blob.size < 1000) { setRecording(false); setRecordSeconds(0); return }

        // Upload voice note to server
        setVoiceUploading(true)
        setRecording(false)
        setRecordSeconds(0)
        try {
          const fd = new FormData()
          fd.append('clientId', clientId)
          fd.append('audio', blob, `voice-${Date.now()}.webm`)
          const res = await fetch('/api/chat/voice', { method: 'POST', body: fd })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Upload failed')
          onAttachmentSent?.(data.studentMessage, data.aiMessage)
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Voice upload failed')
        } finally {
          setVoiceUploading(false)
        }
      }

      mr.start(250) // collect chunks every 250ms
      setRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    } catch {
      alert('Microphone access denied. Please allow microphone access to send voice notes.')
    }
  }, [clientId, onAttachmentSent])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

  // ── File attachment ────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setUploadError('File must be 10 MB or less'); return }
    setUploadError(null)
    setPendingFile(file)
    e.target.value = ''
  }

  const handleUpload = async () => {
    if (!pendingFile) return
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('clientId', clientId)
      fd.append('file', pendingFile)
      const res = await fetch('/api/chat/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onAttachmentSent?.(data.studentMessage, data.aiMessage)
      setPendingFile(null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
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

  return (
    <div
      className="shrink-0 border-t pb-[env(safe-area-inset-bottom,0px)]"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(10,63,58,0.6)', backdropFilter: 'blur(12px)' }}
    >
      {/* Pending file preview */}
      {pendingFile && (
        <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <span className="text-white/50"><AttachIcon type={getAttachType(pendingFile.type)} /></span>
          <span className="min-w-0 flex-1 truncate text-xs text-white/70">{pendingFile.name}</span>
          <button type="button" onClick={() => { setPendingFile(null); setUploadError(null) }}
            className="shrink-0 text-white/30 hover:text-white" aria-label="Remove file">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {uploadError && (
        <p className="px-4 pb-1 text-xs text-orange">{uploadError}</p>
      )}

      {/* Recording indicator */}
      {recording && (
        <div className="flex items-center gap-2 px-4 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          <span className="text-xs font-medium text-red-300">Recording {formatSeconds(recordSeconds)}</span>
          <span className="text-xs text-white/30">— Release to send</span>
        </div>
      )}

      {/* Voice uploading indicator */}
      {voiceUploading && (
        <div className="flex items-center gap-2 px-4 py-1.5">
          <svg className="h-3 w-3 animate-spin text-white/50" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-xs text-white/50">Sending voice note…</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2.5 px-4 py-3">
        {/* Attachment */}
        <button type="button" onClick={() => fileInputRef.current?.click()}
          disabled={busy || recording} aria-label="Attach file"
          className="shrink-0 text-white/30 transition-colors hover:text-white/70 disabled:opacity-20">
          <Paperclip className="h-5 w-5" />
        </button>
        <input ref={fileInputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />

        {/* Text input */}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            recording ? 'Recording…'
            : voiceUploading ? 'Sending voice note…'
            : pendingFile ? 'Add a caption (optional)'
            : 'Type your message…'
          }
          disabled={busy || recording}
          autoFocus
          autoComplete="off"
          className="min-h-[44px] min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        />

        {/* Mic button — hold to record */}
        <button
          type="button"
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={(e) => { e.preventDefault(); startRecording() }}
          onTouchEnd={(e) => { e.preventDefault(); stopRecording() }}
          disabled={busy || !!pendingFile}
          aria-label={recording ? 'Stop recording' : 'Hold to record voice note'}
          className={`shrink-0 transition-all disabled:opacity-20 ${
            recording
              ? 'scale-110 text-red-400'
              : 'text-white/30 hover:text-white/70'
          }`}
        >
          {recording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
        </button>

        {/* Send button */}
        <button
          type="submit"
          disabled={busy || recording || (!pendingFile && !value.trim())}
          aria-label={pendingFile ? (uploading ? 'Uploading…' : 'Send file') : 'Send message'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all hover:brightness-110 disabled:opacity-30"
          style={{ background: 'var(--grad-teal)' }}
        >
          {uploading ? (
            <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </form>
    </div>
  )
})
