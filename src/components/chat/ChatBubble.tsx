import { FileText, FileArchive, File, ExternalLink, Mic } from 'lucide-react'
import type { ChatMessage, ChatAttachmentType } from '@/types'

type Props = {
  message: ChatMessage
}

function AttachmentPreview({
  url,
  name,
  type,
}: {
  url: string
  name: string
  type: ChatAttachmentType | 'audio'
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

export function ChatBubble({ message }: Props) {
  const isAi = message.sender === 'ai'
  const time = new Date(message.timestamp).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const hasAttachment =
    message.attachment_url && message.attachment_name && message.attachment_type

  const isFilePlaceholder = /^\[File: .+\]$/.test(message.message_text)

  // ── Card style per sender ─────────────────────────────────────────
  const cardStyle: React.CSSProperties = isAi
    ? {
        background: 'rgba(10,63,58,0.80)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }
    : {
        background: 'rgba(183,199,51,0.92)',  /* --green at high opacity */
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }

  return (
    <div className={`flex flex-col gap-0.5 ${isAi ? 'items-start' : 'items-end'}`}>
      {hasAttachment && (
        <div
          className={`max-w-[80%] overflow-hidden rounded-2xl px-3 py-2.5 ${isAi ? 'text-white' : 'text-[#0A3F3A]'}`}
          style={cardStyle}
        >
          <AttachmentPreview
            url={message.attachment_url!}
            name={message.attachment_name!}
            type={message.attachment_type as ChatAttachmentType | 'audio'}
          />
        </div>
      )}

      {!isFilePlaceholder && (
        <div
          className={`max-w-[80%] overflow-hidden rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isAi ? 'text-white' : 'font-semibold text-[#0A3F3A]'
          }`}
          style={cardStyle}
        >
          {message.message_text}
        </div>
      )}

      <span className={`px-1 text-[10px] text-white/40`}>{time}</span>
    </div>
  )
}
