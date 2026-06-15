import { FileText, FileArchive, File, ExternalLink } from 'lucide-react'
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
  type: ChatAttachmentType
}) {
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

  // If the message is ONLY a file (text is "[File: ...]") hide the text bubble
  const isFilePlaceholder = /^\[File: .+\]$/.test(message.message_text)

  return (
    <div className={`flex flex-col gap-0.5 ${isAi ? 'items-start' : 'items-end'}`}>
      {hasAttachment && (
        <div
          className={`max-w-[85%] rounded-2xl px-3 py-2 ${
            isAi ? 'bg-grad-blue crisp-on-dark text-white' : 'bg-grad-green crisp-on-dark text-text'
          }`}
        >
          <AttachmentPreview
            url={message.attachment_url!}
            name={message.attachment_name!}
            type={message.attachment_type!}
          />
        </div>
      )}

      {!isFilePlaceholder && (
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-bold leading-relaxed ${
            isAi ? 'bg-grad-blue crisp-on-dark text-white' : 'bg-grad-green crisp-on-dark text-text'
          }`}
        >
          {message.message_text}
        </div>
      )}

      <span className="px-1 text-[10px] text-text/40">{time}</span>
    </div>
  )
}
