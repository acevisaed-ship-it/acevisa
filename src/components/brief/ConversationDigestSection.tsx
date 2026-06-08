import type { AIProfileData, Conversation } from '@/types'
import { buildConversationDigest } from '@/lib/brief'
import { BriefCard } from './BriefCard'

type Props = {
  conversations: Conversation[]
  profile: AIProfileData | null
}

export function ConversationDigestSection({ conversations, profile }: Props) {
  const digest = buildConversationDigest(conversations, profile)

  return (
    <BriefCard>
      <h2 className="mb-4 text-lg font-bold text-text">Conversation Digest</h2>
      {conversations.length === 0 ? (
        <p className="text-sm text-text/60">No chat history yet.</p>
      ) : digest.length === 0 ? (
        <p className="text-sm text-text/60">No chat history yet.</p>
      ) : (
        <div className="space-y-5">
          {digest.map((group) => (
            <div key={group.stageLabel}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-blue">
                {group.stageLabel}
              </p>
              <ul className="space-y-2">
                {group.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </BriefCard>
  )
}
