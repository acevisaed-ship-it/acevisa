import { FileText, FileArchive, File, ExternalLink, Mic } from 'lucide-react'
import type { ChatMessage, ChatAttachmentType } from '@/types'

type Props = {
  message: ChatMessage
  counselorName?: string | null
}

function AttachmentPreview({
  url,
  name,
  type,
  transcript,
}: {
  url: string
  name: string
  type: ChatAttachmentType | 'audio'
  transcript?: string | null
}) {
  if (type === 'audio') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs opacity-70">
          <Mic className="h-3.5 w-3.5" />
          <span>Voice note</span>
        </div>
        <audio
          controls
          src={url}
          className="h-8 w-full max-w-[220px]"
          style={{ colorScheme: 'dark' }}
        />
        {transcript && (
          <p className="text-xs leading-relaxed opacity-90">{transcript}</p>
        )}
      </div>
    )
  }

  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt={name}
          className="max-h-48 max-w-full rounded-xl object-cover"
        />
        <span className="mt-1 flex items-center gap-1 text-[11px] opacity-70">
          <ExternalLink className="h-3 w-3" />
          {name}
        </span>
      </a>
    )
  }

  const Icon =
    type === 'pdf' ? FileText :
    type === 'archive' ? FileArchive :
    File

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 transition-colors hover:bg-black/20"
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 truncate text-xs font-medium">{name}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </a>
  )
}

const AI_STYLE: React.CSSProperties = {
  background: 'linear-gradient(145deg, #35a5e0 0%, #2083B9 55%, #176fa0 100%)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
}

const STUDENT_STYLE: React.CSSProperties = {
  background: 'linear-gradient(145deg, #cfe030 0%, #B7C733 55%, #9aab22 100%)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
}

const COUNSELOR_STYLE: React.CSSProperties = {
  background: 'linear-gradient(145deg, #f5a24e 0%, #E48328 55%, #ca7220 100%)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
}

export function ChatBubble({ message, counselorName }: Props) {
  const isAi = message.sender === 'ai'
  const isCounselor = message.sender === 'counselor'
  const isStudent = message.sender === 'student'

  const time = new Date(message.timestamp).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const hasAttachment =
    message.attachment_url && message.attachment_name && message.attachment_type

  const isFilePlaceholder = /^\[File: .+\]$/.test(message.message_text)
  const isVoicePlaceholder = message.message_text === '[Voice note]'
  const isVoiceMessage = message.attachment_type === 'audio'
  const voiceTranscript = isVoiceMessage && !isVoicePlaceholder ? message.message_text : null
  const hideTextBubble = isFilePlaceholder || isVoiceMessage

  const cardStyle = isAi
    ? AI_STYLE
    : isCounselor
    ? COUNSELOR_STYLE
    : STUDENT_STYLE

  // counselor + ai align left; student aligns right
  const alignLeft = isAi || isCounselor

  // text colour — lime bg needs dark text for contrast
  const textColor = isStudent ? 'text-[#0A3F3A]' : 'text-white'

  // counselor name to display (from message record or prop fallback)
  const displayName = message.counselor_name ?? counselorName ?? 'Your Counselor'

  return (
    <div className={`flex flex-col gap-0.5 ${alignLeft ? 'items-start' : 'items-end'}`}>
      {/* Counselor name label */}
      {isCounselor && (
        <span className="px-1 text-[10px] font-semibold" style={{ color: '#f5a24e' }}>
          {displayName}
        </span>
      )}

      {hasAttachment && (
        <div
          className={`max-w-[80%] overflow-hidden rounded-2xl px-3 py-2.5 ${textColor}`}
          style={cardStyle}
        >
          <AttachmentPreview
            url={message.attachment_url!}
            name={message.attachment_name!}
            type={message.attachment_type as ChatAttachmentType | 'audio'}
            transcript={voiceTranscript}
          />
        </div>
      )}

      {!hideTextBubble && (
        <div
          className={`max-w-[80%] overflow-hidden rounded-2xl px-4 py-3 text-sm leading-relaxed ${textColor}`}
          style={cardStyle}
        >
          {message.message_text}
        </div>
      )}

      <span className={`px-1 text-[10px] ${isStudent ? 'text-[#0A3F3A]/60' : 'text-white/40'}`}>{time}</span>
    </div>
  )
}
