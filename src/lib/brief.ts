import type { AIProfileData, Conversation } from '@/types'

export const PIPELINE_STAGES: Record<number, string> = {
  1: 'New lead',
  2: 'Qualified',
  3: 'Registered client',
  4: 'Documents in progress',
  5: 'Application submitted',
  6: 'Visa outcome',
  7: 'Alumni',
}

export function getPipelineStageLabel(stage: number): string {
  return PIPELINE_STAGES[stage] ?? 'Unknown'
}

export function getScoreBadgeColor(score: number | null): string {
  if (score === null) return '#0A3F3A'
  if (score >= 7) return '#B7C733'
  if (score >= 4) return '#E48328'
  return '#0A3F3A'
}

export type DigestGroup = {
  stageLabel: string
  points: string[]
}

function truncateMessage(text: string, maxLen = 120): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen)}…`
}

export function buildConversationDigest(
  conversations: Conversation[],
  profile: AIProfileData | null
): DigestGroup[] {
  if (profile) {
    const groups: DigestGroup[] = []

    const goalPoints = [
      profile.goal_country && `Target country: ${profile.goal_country}`,
      profile.study_field && `Field of study: ${profile.study_field}`,
      profile.start_date && `Preferred start: ${profile.start_date}`,
      profile.education_level && `Education level: ${profile.education_level}`,
    ].filter(Boolean) as string[]

    if (goalPoints.length > 0) {
      groups.push({ stageLabel: 'Goals & Intent', points: goalPoints.slice(0, 3) })
    }

    const practicalPoints = [
      profile.english_test_status && `English test: ${profile.english_test_status}`,
      profile.budget_type && `Budget: ${profile.budget_type}`,
      profile.has_passport !== null &&
        `Passport: ${profile.has_passport ? 'Yes' : 'No'}`,
      profile.visa_refusals && `Prior refusals: ${profile.visa_refusals}`,
    ].filter(Boolean) as string[]

    if (practicalPoints.length > 0) {
      groups.push({ stageLabel: 'Practical Profile', points: practicalPoints.slice(0, 3) })
    }

    const concernPoints = [
      profile.main_concern && `Main concern: ${profile.main_concern}`,
      profile.family_involvement && `Family involvement: ${profile.family_involvement}`,
      profile.score_rationale && `Assessment: ${profile.score_rationale}`,
    ].filter(Boolean) as string[]

    if (concernPoints.length > 0) {
      groups.push({ stageLabel: 'Concerns & Read', points: concernPoints.slice(0, 3) })
    }

    return groups
  }

  const recent = conversations.slice(-10)
  if (recent.length === 0) {
    return [{ stageLabel: 'Conversation', points: ['No conversation history yet.'] }]
  }

  const byStage = new Map<string, Conversation[]>()
  for (const msg of recent) {
    const tag = msg.stage_tag || 'general'
    const list = byStage.get(tag) ?? []
    list.push(msg)
    byStage.set(tag, list)
  }

  return Array.from(byStage.entries()).map(([stage, msgs]) => ({
    stageLabel: stage.replace(/_/g, ' '),
    points: msgs
      .filter((m) => m.sender === 'student')
      .slice(-3)
      .map((m) => truncateMessage(m.message_text)),
  })).filter((g) => g.points.length > 0)
}

export function getPathwaySteps(profile: AIProfileData | null): [string, string, string] | null {
  if (!profile) return null

  const current = profile.english_test_status || 'English test status unknown'
  const step = profile.recommended_service_pathway || 'Pathway to be determined'
  const goal = profile.goal_country
    ? `Study Visa — ${profile.goal_country}`
    : 'Study Visa'

  return [current, step, goal]
}
