import type { AIProfileData, Client } from '@/types'
import { getPipelineStageLabel, getScoreBadgeColor } from '@/lib/brief'
import { formatPKTRegistrationDate } from '@/lib/pkt'
import { BriefCard } from './BriefCard'

type Props = {
  client: Client
  profile: AIProfileData | null
  profilePartial?: boolean
  counselorName?: string | null
  footer?: React.ReactNode
}

export function ProfileSummarySection({
  client,
  profile,
  profilePartial = false,
  counselorName,
  footer,
}: Props) {
  const score = client.qualification_score ?? profile?.qualification_score ?? null

  return (
    <BriefCard>
      <h2 className="mb-4 text-lg font-bold text-white">Profile Summary</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 text-sm text-white/80">
          <p>
            <span className="font-bold">Name:</span> {client.name}
          </p>
          <p>
            <span className="font-bold">Phone:</span> {client.phone}
          </p>
          <p>
            <span className="font-bold">City:</span> {client.city ?? '—'}
          </p>
          <p>
            <span className="font-bold">Language:</span> {client.language}
          </p>
          {client.ad_source ? (
            <p>
              <span className="font-bold">Ad Source:</span>{' '}
              <span className="inline-block rounded-full bg-orange px-3 py-0.5 text-xs font-bold text-white/80">
                {client.ad_source}
              </span>
            </p>
          ) : (
            <p>
              <span className="font-bold">Ad Source:</span> —
            </p>
          )}
          <p>
            <span className="font-bold">Registered:</span>{' '}
            {client.registration_date
              ? formatPKTRegistrationDate(client.registration_date)
              : '—'}
          </p>
          <p>
            <span className="font-bold">Pipeline:</span> Stage {client.pipeline_stage} —{' '}
            {getPipelineStageLabel(client.pipeline_stage)}
          </p>
          {counselorName !== undefined && (
            <p>
              <span className="font-bold">Assigned counselor:</span>{' '}
              {counselorName ?? '—'}
            </p>
          )}
        </div>
        <div className="space-y-3">
          {profile ? (
            <>
              {score !== null && score > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-white/50">
                    Qualification Score
                  </p>
                  <p className="text-4xl font-bold text-white">{score}</p>
                </div>
              )}
              <p className="text-sm italic text-white/80">
                {profile.score_rationale || '—'}
              </p>
              <p className="text-sm text-white/80">
                <span className="font-bold">Recommended pathway:</span>{' '}
                {profile.recommended_service_pathway || '—'}
              </p>
              {profilePartial && (
                <p className="text-sm italic text-white/50">
                  Partial profile — full summary generates after conversation completes.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-4xl font-bold text-white/80/30">—</p>
              <p className="text-sm italic text-white/50">—</p>
              <p className="text-sm text-white/80">
                <span className="font-bold">Recommended pathway:</span> —
              </p>
              <p className="text-sm italic text-white/50">AI profile not yet generated</p>
            </>
          )}
        </div>
      </div>
      {footer}
    </BriefCard>
  )
}

export function ClientProfileHeader({
  client,
  score,
}: {
  client: Client
  score: number | null
}) {
  const scoreColor =
    score !== null && score > 0 ? getScoreBadgeColor(score) : null

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">{client.name}</h1>
      {score !== null && score > 0 && scoreColor && (
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white/80"
          style={{ backgroundColor: scoreColor }}
        >
          {score}
        </span>
      )}
      <span className="rounded-full border border-white/20 glass-card px-3 py-1 text-xs font-medium text-white/70">
        Stage {client.pipeline_stage} — {getPipelineStageLabel(client.pipeline_stage)}
      </span>
    </div>
  )
}
