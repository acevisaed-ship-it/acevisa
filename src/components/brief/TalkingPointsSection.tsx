import type { AIProfileData } from '@/types'
import { BriefCard } from './BriefCard'

type Props = {
  profile: AIProfileData | null
}

export function TalkingPointsSection({ profile }: Props) {
  const points = profile?.suggested_talking_points ?? []

  return (
    <BriefCard>
      <h2 className="mb-4 text-lg font-bold text-white">Suggested Talking Points</h2>
      {points.length > 0 ? (
        <div className="space-y-3">
          {points.map((point, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-full bg-green px-1 text-sm font-bold text-text">
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm text-white/80">{point}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/50">No talking points generated yet.</p>
      )}
    </BriefCard>
  )
}
