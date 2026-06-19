'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { AIProfileData, Conversation } from '@/types'
import { buildConversationDigest } from '@/lib/brief'
import { BriefCard } from './BriefCard'

type Props = {
  conversations: Conversation[]
  profile: AIProfileData | null
}

export function ConversationDigestSection({ conversations, profile }: Props) {
  const [open, setOpen] = useState(true)
  const digest = buildConversationDigest(conversations, profile)

  return (
    <BriefCard>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <h2 className="text-lg font-bold text-white">Conversation Digest</h2>
        {open ? (
          <ChevronUp className="h-4 w-4 text-white/40 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
        )}
      </button>

      {open && (
        <div className="mt-4">
          {conversations.length === 0 || digest.length === 0 ? (
            <p className="text-sm text-white/50">No chat history yet.</p>
          ) : (
            <div className="space-y-5">
              {digest.map((group) => (
                <div key={group.stageLabel}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">
                    {group.stageLabel}
                  </p>
                  <ul className="space-y-2">
                    {group.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </BriefCard>
  )
}
