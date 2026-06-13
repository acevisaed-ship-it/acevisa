export const PROFILE_UPDATE_PATTERNS = [
  // IELTS / English tests
  {
    pattern: /(?:my\s+)?(?:ielts|pte|toefl|oet|duolingo)\s+(?:score|result|band|is|was|got|overall)[\s:]+(?:is\s+|was\s+|got\s+)?([\d.]+)/i,
    field: 'ielts_score',
  },
  // Birth year / age
  {
    pattern: /(?:i am|i'm|im)\s+(\d{2})\s+years?\s+old/i,
    field: 'age',
  },
  {
    pattern: /(?:i was|i'm|im)\s+born\s+in\s+(\d{4})/i,
    field: 'birth_year',
  },
  // City / location
  {
    pattern: /i\s+(?:live|am|currently|reside|stay|m)\s+(?:in|from|based in|residing in)\s+([A-Za-z\s]{2,30})/i,
    field: 'city',
  },
  {
    pattern: /(?:i'm|im|i am)\s+from\s+([A-Za-z\s]{2,30})/i,
    field: 'city',
  },
  // Budget / funds
  {
    pattern: /(?:my\s+)?(?:budget|funds?|savings?|money|amount)\s+(?:is|are|around|about|of|roughly)?\s+(?:PKR|rs\.?|rupees?|usd|\$|£|gbp)?\s*[\d,]+/i,
    field: 'budget_mentioned',
  },
  {
    pattern: /(?:i have|i've got|i got|i can spend|i can afford)\s+(?:about|around|roughly|approximately)?\s+(?:PKR|rs\.?|rupees?|usd|\$|£|gbp)?\s*[\d,]+/i,
    field: 'budget_mentioned',
  },
  // Education
  {
    pattern: /i\s+(?:have|have completed|completed|did|finished|got|passed)\s+(?:my\s+)?(?:a\s+)?(?:bachelor'?s?|master'?s?|phd|mba|bba|bsc|msc|bcom|mcom|intermediate|matric|o-levels?|a-levels?|degree|diploma|graduation)/i,
    field: 'education_mentioned',
  },
  {
    pattern: /(?:my\s+)?(?:highest\s+)?(?:education|qualification|degree)\s+(?:is|was|level)?\s+([A-Za-z\s']+)/i,
    field: 'education_mentioned',
  },
  // Destination country
  {
    pattern: /i\s+want\s+to\s+(?:go|move|study|migrate|settle|work)\s+(?:to|in)\s+([A-Za-z\s]{2,30})/i,
    field: 'destination_country',
  },
  {
    pattern: /(?:my\s+)?destination\s+(?:is|country\s+is)\s+([A-Za-z\s]{2,30})/i,
    field: 'destination_country',
  },
  // Visa type
  {
    pattern: /(?:i\s+(?:need|want|am\s+applying\s+for|looking\s+for)\s+(?:a\s+)?)?(?:student|work|visit|tourist|family|spouse|skilled\s+worker|pr|permanent\s+residency)\s+visa/i,
    field: 'visa_type',
  },
  // Employment
  {
    pattern: /i\s+(?:am|'m|work\s+as|am\s+working\s+as)\s+(?:a\s+|an\s+)?([A-Za-z\s]{2,30})/i,
    field: 'employment',
  },
  {
    pattern: /i\s+(?:am|'m)\s+(?:employed|self[- ]employed|a\s+business\s+owner|unemployed|a\s+student|working)/i,
    field: 'employment',
  },
] as const

export function detectProfileUpdates(message: string): Record<string, string> {
  const proposedChanges: Record<string, string> = {}
  for (const { pattern, field } of PROFILE_UPDATE_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      // Don't overwrite a field that's already been matched by a higher-priority pattern
      if (!proposedChanges[field]) {
        proposedChanges[field] = match[0]
      }
    }
  }
  return proposedChanges
}

export const PROFILE_FIELD_LABELS: Record<string, string> = {
  ielts_score: 'IELTS / English test score',
  age: 'Age',
  birth_year: 'Birth year',
  city: 'City / Location',
  budget_mentioned: 'Budget',
  education_mentioned: 'Education level',
  destination_country: 'Destination country',
  visa_type: 'Visa type',
  employment: 'Employment status',
}

export function applyApprovedFieldUpdate(
  field: string,
  rawMatch: string
): { clientUpdates: Record<string, string>; profileUpdates: Record<string, string> } {
  const clientUpdates: Record<string, string> = {}
  const profileUpdates: Record<string, string> = {}

  if (field === 'city') {
    const cityMatch = rawMatch.match(/(?:in|from|based in|residing in)\s+([A-Za-z\s]+)/i)
    if (cityMatch?.[1]) {
      clientUpdates.city = cityMatch[1].trim()
    }
  } else if (field === 'ielts_score') {
    const testMatch = rawMatch.match(/(ielts|pte|toefl|oet|duolingo)/i)
    const scoreMatch = rawMatch.match(/([\d.]+)/)
    if (testMatch && scoreMatch) {
      profileUpdates.english_test_status = `${testMatch[1].toUpperCase()} ${scoreMatch[1]}`
    }
  } else if (field === 'education_mentioned') {
    profileUpdates.education_level = rawMatch
  } else if (field === 'budget_mentioned') {
    profileUpdates.budget_type = rawMatch
  } else if (field === 'destination_country') {
    const countryMatch = rawMatch.match(/(?:to|in)\s+([A-Za-z\s]+)/i)
    if (countryMatch?.[1]) {
      profileUpdates.target_country = countryMatch[1].trim()
    }
  } else if (field === 'visa_type') {
    profileUpdates.visa_type = rawMatch
  } else if (field === 'employment') {
    profileUpdates.employment_status = rawMatch
  } else if (field === 'age' || field === 'birth_year') {
    profileUpdates[field] = rawMatch
  }

  return { clientUpdates, profileUpdates }
}
