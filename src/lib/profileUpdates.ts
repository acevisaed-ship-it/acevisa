export const PROFILE_UPDATE_PATTERNS = [
  {
    pattern: /my (ielts|pte|toefl) (score|result|band) (is|was|got)\s+([\d.]+)/i,
    field: 'ielts_score',
  },
  { pattern: /i (am|was) born in\s+(\d{4})/i, field: 'birth_year' },
  {
    pattern: /i (live|moved|am) (in|to|from)\s+([A-Za-z\s]+)/i,
    field: 'city',
  },
  {
    pattern: /my (budget|funds?|savings?) (is|are|around|about)\s+([A-Za-z0-9,\s]+)/i,
    field: 'budget_mentioned',
  },
  {
    pattern: /i (have|got|completed?) (a |my )?(bachelor|master|degree|diploma|phd)/i,
    field: 'education_mentioned',
  },
] as const

export function detectProfileUpdates(message: string): Record<string, string> {
  const proposedChanges: Record<string, string> = {}
  for (const { pattern, field } of PROFILE_UPDATE_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      proposedChanges[field] = match[0]
    }
  }
  return proposedChanges
}

export const PROFILE_FIELD_LABELS: Record<string, string> = {
  ielts_score: 'IELTS / test score',
  birth_year: 'Birth year',
  city: 'City',
  budget_mentioned: 'Budget',
  education_mentioned: 'Education',
}

export function applyApprovedFieldUpdate(
  field: string,
  rawMatch: string
): { clientUpdates: Record<string, string>; profileUpdates: Record<string, string> } {
  const clientUpdates: Record<string, string> = {}
  const profileUpdates: Record<string, string> = {}

  if (field === 'city') {
    const cityMatch = rawMatch.match(/i (live|moved|am) (in|to|from)\s+([A-Za-z\s]+)/i)
    if (cityMatch?.[3]) {
      clientUpdates.city = cityMatch[3].trim()
    }
  } else if (field === 'ielts_score') {
    const testMatch = rawMatch.match(/my (ielts|pte|toefl)/i)
    const scoreMatch = rawMatch.match(/([\d.]+)/)
    if (testMatch && scoreMatch) {
      profileUpdates.english_test_status = `${testMatch[1].toUpperCase()} ${scoreMatch[1]}`
    }
  } else if (field === 'education_mentioned') {
    profileUpdates.education_level = rawMatch
  } else if (field === 'budget_mentioned') {
    profileUpdates.budget_type = rawMatch
  }

  return { clientUpdates, profileUpdates }
}
