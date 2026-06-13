import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ChatHeader } from '@/components/chat/ChatHeader'
import type { AIProfileData, Client, Conversation, Document } from '@/types'
import { formatPKTMeetingHeader } from '@/lib/pkt'
import { ConversationDigestSection } from './ConversationDigestSection'
import { DocumentsChecklistSection } from './DocumentsChecklistSection'
import { OnlineStatusToggle } from './OnlineStatusToggle'
import {
  ClientProfileHeader,
  ProfileSummarySection,
} from './ProfileSummarySection'
import { PsychologicalReadSection } from './PsychologicalReadSection'
import { ServicePathwaySection } from './ServicePathwaySection'
import { StrategyChat } from './StrategyChat'
import { TalkingPointsSection } from './TalkingPointsSection'
import { BriefCard } from './BriefCard'

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

  return (
    <>
      <ChatHeader
        clientName={client.name}
        counselorName={counselorName}
        counselorAvatarUrl={counselorAvatarUrl}
      />
      <main className="flex-1 bg-bg p-4 md:p-8">
        <div className="mx-auto max-w-[900px]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-text/10 text-text transition-colors hover:border-text/30"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <p className="text-sm font-medium text-blue">
                {formatPKTMeetingHeader(meetingTime)}
              </p>
            </div>
            <OnlineStatusToggle
              counselorId={counselorId}
              initialOnline={initialOnline}
              initialAutoReply={initialAutoReply}
            />
          </div>

          <ClientProfileHeader client={client} score={score} />

          <ProfileSummarySection client={client} profile={profile} />
          <ConversationDigestSection
            conversations={conversations}
            profile={profile}
          />
          <ServicePathwaySection profile={profile} />
          <PsychologicalReadSection profile={profile} />
          <TalkingPointsSection profile={profile} />
          <DocumentsChecklistSection documents={documents} clientId={client.id} />

          <BriefCard>
            <div className="flex min-h-[50vh] flex-col lg:min-h-0">
              <StrategyChat clientId={client.id} />
            </div>
          </BriefCard>
        </div>
      </main>
    </>
  )
}
