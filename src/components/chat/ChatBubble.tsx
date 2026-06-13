import type { ChatMessage } from '@/types'

type Props = {
  message: ChatMessage
}

export function ChatBubble({ message }: Props) {
  const isAi = message.sender === 'ai'
  const time = new Date(message.timestamp).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex flex-col gap-0.5 ${isAi ? 'items-start' : 'items-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-bold leading-relaxed ${
          isAi ? 'bg-[#2083B9] text-white' : 'bg-[#B7C733] text-[#0A3F3A]'
        }`}
      >
        {message.message_text}
      </div>
      <span className="px-1 text-[10px] text-text/40">{time}</span>
    </div>
  )
}
