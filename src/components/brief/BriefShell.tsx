'use client'

import Link from 'next/link'
import { ArrowLeft, Brain, CheckCircle, CheckCircle2, Clock } from 'lucide-react'
import { ChatHeader } from '@/components/chat/ChatHeader'
import type { AIProfileData, Client, Conversation, Document } from '@/types'
import {
  buildConversationDigest,
  getPathwaySteps,
  getPipelineStageLabel,
  getScoreBadgeColor,
} from '@/lib/brief'
import { formatPKTMeetingHeader, formatPKTRegistrationDate } from '@/lib/pkt'
import { OnlineStatusToggle } from './OnlineStatusToggle'
import { StrategyChat } from './StrategyChat'

type Props = {
  meetingTime: string
  counselorId: string
  counselorName: string
  counselorAvatarUrl?: string | null
  initialOnline: boolean
  initialAutoReply: boolean
  client: Client
  profile: AIProfileData | null
  conversations: Conversation[]
  documents: Document[]
}

function BriefCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-card border border-text/10 bg-white/80 p-6">
      {children}
    </section>
  )
}

function NoProfileMessage() {
  return (
    <p className="text-sm italic text-text/60">AI profile not yet generated.</p>
  )
}

const DOCUMENT_STATUS = {
  uploaded: { icon: CheckCircle, color: 'text-green', label: 'Uploaded' },
  verified: { icon: CheckCircle2, color: 'text-blue', label: 'Verified' },
  requested: { icon: Clock, color: 'text-orange', label: 'Requested' },
} as const

export function BriefShell({
  meetingTime,
  counselorId,
  counselorName,
  counselorAvatarUrl,
  initialOnline,
  initialAutoReply,
  client,
  profile,
  conversations,
  documents,
}: Props) {
  const score = client.qualification_score ?? profile?.qualification_score ?? null
  const badgeColor = getScoreBadgeColor(score)
  const digest = buildConversationDigest(conversations, profile)
  const pathwaySteps = getPathwaySteps(profile)

  return (
    <>
      <ChatHeader
        clientName={client.name}
        counselorName={counselorName}
        counselorAvatarUrl={counselorAvatarUrl}
      />
      <main className="flex-1 bg-bg p-6 md:p-8">
      <div className="mx-auto max-w-[900px]">
        {/* Top bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-text/10 text-text transition-colors hover:border-text/30"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <p className="text-sm font-medium text-blue">{formatPKTMeetingHeader(meetingTime)}</p>
          </div>
          <OnlineStatusToggle
            counselorId={counselorId}
            initialOnline={initialOnline}
            initialAutoReply={initialAutoReply}
          />
        </div>

        {/* Page title */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-bold text-blue">{client.name}</h1>
          {score !== null && (
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-text"
              style={{ backgroundColor: badgeColor }}
            >
              {score}
            </span>
          )}
        </div>

        {/* Section A — Profile Summary */}
        <BriefCard>
          <h2 className="mb-4 text-lg font-bold text-text">Profile Summary</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 text-sm text-text">
              <p><span className="font-bold">Name:</span> {client.name}</p>
              <p><span className="font-bold">Phone:</span> {client.phone}</p>
              <p><span className="font-bold">City:</span> {client.city ?? '—'}</p>
              <p><span className="font-bold">Language:</span> {client.language}</p>
              {client.ad_source && (
                <p>
                  <span className="font-bold">Ad Source:</span>{' '}
                  <span className="inline-block rounded-full bg-orange px-3 py-0.5 text-xs font-bold text-text">
                    {client.ad_source}
                  </span>
                </p>
              )}
              <p>
                <span className="font-bold">Registered:</span>{' '}
                {formatPKTRegistrationDate(client.registration_date)}
              </p>
              <p>
                <span className="font-bold">Pipeline:</span> Stage {client.pipeline_stage} —{' '}
                {getPipelineStageLabel(client.pipeline_stage)}
              </p>
            </div>
            <div className="space-y-3">
              {profile ? (
                <>
                  {score !== null && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-text/60">
                        Qualification Score
                      </p>
                      <p className="text-4xl font-bold text-blue">{score}</p>
                    </div>
                  )}
                  {profile.score_rationale && (
                    <p className="text-sm italic text-text">{profile.score_rationale}</p>
                  )}
                  {profile.recommended_service_pathway && (
                    <p className="text-sm text-text">
                      <span className="font-bold">Recommended pathway:</span>{' '}
                      {profile.recommended_service_pathway}
                    </p>
                  )}
                </>
              ) : (
                <NoProfileMessage />
              )}
            </div>
          </div>
        </BriefCard>

        {/* Section B — Conversation Digest */}
        <BriefCard>
          <h2 className="mb-4 text-lg font-bold text-text">Conversation Digest</h2>
          {digest.length === 0 ? (
            <p className="text-sm text-text/60">No conversation data available.</p>
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

        {/* Section C — Recommended Service Pathway */}
        <BriefCard>
          <h2 className="mb-4 text-lg font-bold text-text">Recommended Service Pathway</h2>
          {pathwaySteps ? (
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              {pathwaySteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="rounded-xl border border-blue bg-bg px-4 py-3 text-sm font-medium text-text">
                    {step}
                  </div>
                  {i < pathwaySteps.length - 1 && (
                    <span className="hidden shrink-0 text-xl font-bold text-green sm:block">→</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <NoProfileMessage />
          )}
        </BriefCard>

        {/* Section D — Psychological Read */}
        <BriefCard>
          <h2 className="mb-4 text-lg font-bold text-text">Psychological Read</h2>
          {profile?.psychological_notes && profile.psychological_notes.length > 0 ? (
            <div className="space-y-3">
              {profile.psychological_notes.map((note, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl bg-text px-4 py-3 text-sm text-bg"
                >
                  <Brain className="mt-0.5 h-5 w-5 shrink-0" />
                  {note}
                </div>
              ))}
            </div>
          ) : (
            <NoProfileMessage />
          )}
        </BriefCard>

        {/* Section E — Suggested Talking Points */}
        <BriefCard>
          <h2 className="mb-4 text-lg font-bold text-text">Suggested Talking Points</h2>
          {profile?.suggested_talking_points && profile.suggested_talking_points.length > 0 ? (
            <div className="space-y-3">
              {profile.suggested_talking_points.map((point, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green text-sm font-bold text-text">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-sm text-text">{point}</p>
                </div>
              ))}
            </div>
          ) : (
            <NoProfileMessage />
          )}
        </BriefCard>

        {/* Section F — Documents Checklist */}
        <BriefCard>
          <h2 className="mb-4 text-lg font-bold text-text">Documents Checklist</h2>
          {documents.length === 0 ? (
            <p className="text-sm text-text/60">
              No documents requested yet. Add them from the client record.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const config = DOCUMENT_STATUS[doc.status] ?? DOCUMENT_STATUS.requested
                const Icon = config.icon
                return (
                  <div key={doc.id} className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 shrink-0 ${config.color}`} />
                    <span className="flex-1 text-sm font-medium text-text">
                      {doc.document_name}
                    </span>
                    <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </BriefCard>

        {/* Section G — AI Strategy Chat */}
        <BriefCard>
          <StrategyChat clientId={client.id} />
        </BriefCard>
      </div>
    </main>
    </>
  )
}
