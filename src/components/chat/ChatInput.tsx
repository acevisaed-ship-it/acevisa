'use client'

import { type FormEvent, useRef, useState, useCallback, useEffect } from 'react'
import { Paperclip, Mic, MicOff, X, FileText, FileImage, FileArchive, File } from 'lucide-react'
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

export function ChatInput({
  clientId,
  value,
  onChange,
  onSend,
  onAttachmentSent,
  disabled = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Voice / speech
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startRecording = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      alert('Voice notes are not supported in this browser. Please use Chrome on Android or desktop.')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      setTranscript(final || interim)
    }

    recognition.onerror = () => {
      setRecording(false)
    }

    recognition.onend = () => {
      setRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
    setTranscript('')
  }, [])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    setRecording(false)
  }, [])

  // When recording stops, move transcript → input field
  useEffect(() => {
    if (!recording && transcript) {
      onChange(transcript)
      setTranscript('')
    }
  }, [recording, transcript, onChange])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File must be 10 MB or less')
      return
    }
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

  return (
    <div className="sticky bottom-0 border-t border-text/10 bg-bg pb-[env(safe-area-inset-bottom,0px)]">
      {/* Pending file preview */}
      {pendingFile && (
        <div className="flex items-center gap-2 border-b border-text/10 px-4 py-2">
          <span className="text-text/60">
            <AttachIcon type={getAttachType(pendingFile.type)} />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-text/80">{pendingFile.name}</span>
          <button
            type="button"
            onClick={() => { setPendingFile(null); setUploadError(null) }}
            className="shrink-0 text-text/40 hover:text-text"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {uploadError && (
        <p className="px-4 pb-1 text-xs text-orange">{uploadError}</p>
      )}

      {/* Voice transcript preview */}
      {recording && transcript && (
        <p className="px-4 pb-1 text-xs italic text-text/50">{transcript}</p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3">
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          aria-label="Attach file"
          className="shrink-0 text-text/40 transition-colors hover:text-text disabled:opacity-30"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={recording ? 'Listening…' : pendingFile ? 'Add a caption (optional)' : 'Type your message…'}
          disabled={disabled || uploading || recording}
          className="min-h-[48px] min-w-0 flex-1 rounded-full border border-text bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text/40 outline-none focus:border-blue disabled:opacity-50"
        />

        {/* Mic button */}
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={disabled || uploading || !!pendingFile}
          aria-label={recording ? 'Stop recording' : 'Record voice note'}
          className={`shrink-0 transition-colors disabled:opacity-30 ${recording ? 'text-orange animate-pulse' : 'text-text/40 hover:text-text'}`}
        >
          {recording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {/* Send / Upload button */}
        <button
          type="submit"
          disabled={disabled || uploading || (!pendingFile && !value.trim())}
          aria-label={pendingFile ? (uploading ? 'Uploading…' : 'Send file') : 'Send message'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green text-text transition-opacity disabled:opacity-40"
        >
          {uploading ? (
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}
