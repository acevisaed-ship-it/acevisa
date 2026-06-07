import type { ChatMessage } from '@/types'

type Props = {
  message: ChatMessage
}

export function ChatBubble({ message }: Props) {
  const isAi = message.sender === 'ai'

  return (
    <div className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-bold leading-relaxed ${
          isAi
            ? 'bg-[#2083B9] text-white'
            : 'bg-[#B7C733] text-[#0A3F3A]'
        }`}
      >
        {message.message_text}
      </div>
    </div>
  )
}
