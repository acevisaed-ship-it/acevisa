import type { AIProfileData, Client } from '@/types'
import { getPipelineStageLabel, getScoreBadgeColor } from '@/lib/brief'
import { formatPKTRegistrationDate } from '@/lib/pkt'
import { BriefCard } from './BriefCard'

type Props = {
  client: Client
  profile: AIProfileData | null
  counselorName?: string | null
  footer?: React.ReactNode
}

export function ProfileSummarySection({
  client,
  profile,
  counselorName,
  footer,
}: Props) {
  const score = client.qualification_score ?? profile?.qualification_score ?? null

  return (
    <BriefCard>
      <h2 className="mb-4 text-lg font-bold text-text">Profile Summary</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 text-sm text-text">
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
              <span className="inline-block rounded-full bg-orange px-3 py-0.5 text-xs font-bold text-text">
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
                  <p className="text-xs font-bold uppercase tracking-wide text-text/60">
                    Qualification Score
                  </p>
                  <p className="text-4xl font-bold text-blue">{score}</p>
                </div>
              )}
              <p className="text-sm italic text-text">
                {profile.score_rationale || '—'}
              </p>
              <p className="text-sm text-text">
                <span className="font-bold">Recommended pathway:</span>{' '}
                {profile.recommended_service_pathway || '—'}
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold text-text/30">—</p>
              <p className="text-sm italic text-text/60">—</p>
              <p className="text-sm text-text">
                <span className="font-bold">Recommended pathway:</span> —
              </p>
              <p className="text-sm italic text-text/60">AI profile not yet generated</p>
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
      <h1 className="text-2xl font-bold text-blue sm:text-3xl">{client.name}</h1>
      {score !== null && score > 0 && scoreColor && (
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-text"
          style={{ backgroundColor: scoreColor }}
        >
          {score}
        </span>
      )}
      <span className="rounded-full border border-text/15 bg-white px-3 py-1 text-xs font-medium text-text">
        Stage {client.pipeline_stage} — {getPipelineStageLabel(client.pipeline_stage)}
      </span>
    </div>
  )
}
