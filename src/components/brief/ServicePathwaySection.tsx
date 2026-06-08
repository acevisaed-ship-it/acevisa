import type { AIProfileData } from '@/types'
import { getPathwaySteps } from '@/lib/brief'
import { BriefCard } from './BriefCard'

type Props = {
  profile: AIProfileData | null
}

const PLACEHOLDER_STEPS = ['—', '—', '—'] as const

export function ServicePathwaySection({ profile }: Props) {
  const pathwaySteps = getPathwaySteps(profile)
  const steps = pathwaySteps ?? PLACEHOLDER_STEPS

  return (
    <BriefCard>
      <h2 className="mb-4 text-lg font-bold text-text">Recommended Service Pathway</h2>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
            <div className="w-full rounded-xl border border-blue bg-bg px-4 py-3 text-sm font-medium text-text sm:w-auto">
              {step}
            </div>
            {i < steps.length - 1 && (
              <>
                <span className="shrink-0 text-xl font-bold text-green sm:hidden">↓</span>
                <span className="hidden shrink-0 text-xl font-bold text-green sm:block">→</span>
              </>
            )}
          </div>
        ))}
      </div>
    </BriefCard>
  )
}
