import { Brain } from 'lucide-react'
import type { AIProfileData } from '@/types'
import { BriefCard } from './BriefCard'

type Props = {
  profile: AIProfileData | null
}

export function PsychologicalReadSection({ profile }: Props) {
  const notes = profile?.psychological_notes ?? []

  return (
    <BriefCard>
      <h2 className="mb-4 text-lg font-bold text-white">Psychological Read</h2>
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl glass-card-md px-4 py-3 text-sm text-white/80"
            >
              <Brain className="mt-0.5 h-5 w-5 shrink-0" />
              {note}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/50">No psychological notes generated yet.</p>
      )}
    </BriefCard>
  )
}
