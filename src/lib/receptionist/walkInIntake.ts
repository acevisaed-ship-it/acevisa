import {
  STUDY_VISA,
  scoredLanguageTests,
} from '@/lib/receptionist/intakeOptions'

export type ScoredLanguageTest = (typeof scoredLanguageTests)[number]

export type TravelHistoryEntry = {
  country: string
  year: number
  duration: string
}

export type VisaRejectionEntry = {
  applicationCountry: string
  visaCategory: string
  reason: string
}

export type LanguageTestScoreEntry = {
  test: ScoredLanguageTest
  score: string
}

export type WalkInIntakePayload = {
  age: number
  lastEducation: string | null
  educationPercentage: number | null
  educationCompletionYear: number | null
  travelHistory: TravelHistoryEntry[]
  visaRejectionHistory: VisaRejectionEntry[]
  languageTestScores: LanguageTestScoreEntry[]
  budget: string | null
}

export type TravelHistoryDraft = {
  id: string
  country: string
  year: string
  duration: string
}

export type VisaRejectionDraft = {
  id: string
  applicationCountry: string
  visaCategory: string
  visaCategoryCustom: string
  reason: string
}

export type LanguageTestDraft = {
  id: string
  test: string
  score: string
}

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1950
const MAX_VISIT_YEAR = CURRENT_YEAR
const MAX_COMPLETION_YEAR = CURRENT_YEAR + 1

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value).trim() : ''
}

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  const raw = asTrimmed(value)
  if (!raw) return null
  if (!/^-?\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isInteger(n) ? n : null
}

function parseDecimal(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const raw = asTrimmed(value)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function isHalfStep(n: number): boolean {
  return Number.isInteger(Math.round(n * 2)) && Math.abs(n * 2 - Math.round(n * 2)) < 1e-9
}

function isMultipleOf(n: number, step: number): boolean {
  const ratio = n / step
  return Math.abs(ratio - Math.round(ratio)) < 1e-9
}

export function isStudyVisa(interestedIn: string | null | undefined): boolean {
  return interestedIn === STUDY_VISA
}

export function emptyTravelDraft(): TravelHistoryDraft {
  return { id: crypto.randomUUID(), country: '', year: '', duration: '' }
}

export function emptyRejectionDraft(): VisaRejectionDraft {
  return {
    id: crypto.randomUUID(),
    applicationCountry: '',
    visaCategory: '',
    visaCategoryCustom: '',
    reason: '',
  }
}

export function emptyLanguageTestDraft(): LanguageTestDraft {
  return { id: crypto.randomUUID(), test: '', score: '' }
}

export function languageTestScoreHint(test: string): string {
  switch (test) {
    case 'IELTS':
      return 'Band 0–9 in 0.5 steps (e.g. 6.5)'
    case 'PTE':
      return 'Overall score 0–90'
    case 'TOEFL':
      return 'Overall score 0–120'
    case 'Oxford ELLT':
      return 'Oxford scale 0–12 in 0.5 steps (0–10 also accepted)'
    case 'LanguageCert':
      return 'CEFR A1–C2, or Academic score 0–100'
    case 'Duolingo English Test':
      return 'Score 10–160 in 5-point steps'
    default:
      return 'Enter the official score for this test'
  }
}

export function languageTestInputMeta(test: string): {
  inputMode: 'decimal' | 'numeric' | 'text'
  step?: string
  min?: string
  max?: string
} {
  switch (test) {
    case 'IELTS':
    case 'Oxford ELLT':
      return { inputMode: 'decimal', step: '0.5', min: '0', max: test === 'IELTS' ? '9' : '12' }
    case 'PTE':
      return { inputMode: 'numeric', step: '1', min: '0', max: '90' }
    case 'TOEFL':
      return { inputMode: 'numeric', step: '1', min: '0', max: '120' }
    case 'Duolingo English Test':
      return { inputMode: 'numeric', step: '5', min: '10', max: '160' }
    default:
      return { inputMode: 'text' }
  }
}

function isScoredLanguageTest(value: string): value is ScoredLanguageTest {
  return (scoredLanguageTests as readonly string[]).includes(value)
}

function validateLanguageScore(test: ScoredLanguageTest, scoreRaw: string): string | null {
  const score = scoreRaw.trim()
  if (!score) return 'enter the score'

  switch (test) {
    case 'IELTS': {
      const n = parseDecimal(score)
      if (n === null || n < 0 || n > 9 || !isHalfStep(n)) {
        return 'IELTS band must be 0–9 in 0.5 increments (e.g. 6.0 or 7.5)'
      }
      return null
    }
    case 'PTE': {
      const n = parseInteger(score)
      if (n === null || n < 0 || n > 90) return 'PTE score must be a whole number from 0 to 90'
      return null
    }
    case 'TOEFL': {
      const n = parseInteger(score)
      if (n === null || n < 0 || n > 120) return 'TOEFL score must be a whole number from 0 to 120'
      return null
    }
    case 'Oxford ELLT': {
      const n = parseDecimal(score)
      if (n === null || n < 0 || n > 12 || !isHalfStep(n)) {
        return 'Oxford ELLT score must be 0–12 in 0.5 increments (0–10 is also valid)'
      }
      return null
    }
    case 'LanguageCert': {
      const upper = score.toUpperCase()
      const cefrMatch = upper.match(/^(A1|A2|B1|B2|C1|C2)(\s+(PASS|HIGH PASS|DISTINCTION))?$/)
      if (cefrMatch) return null
      const n = parseInteger(score)
      if (n !== null && n >= 0 && n <= 100) return null
      return 'LanguageCert score must be a CEFR level (A1–C2) or an Academic score from 0 to 100'
    }
    case 'Duolingo English Test': {
      const n = parseInteger(score)
      if (n === null || n < 10 || n > 160 || !isMultipleOf(n, 5)) {
        return 'Duolingo English Test score must be 10–160 in 5-point increments'
      }
      return null
    }
    default: {
      const _exhaustive: never = test
      return _exhaustive
    }
  }
}

function normalizeLanguageScore(test: ScoredLanguageTest, score: string): string {
  const trimmed = score.trim()
  if (test === 'LanguageCert') {
    const cefrMatch = trimmed.toUpperCase().match(/^(A1|A2|B1|B2|C1|C2)(\s+(PASS|HIGH PASS|DISTINCTION))?$/)
    if (cefrMatch) {
      const level = cefrMatch[1]
      const result = cefrMatch[3]
      if (result === 'HIGH PASS') return `${level} High Pass`
      if (result === 'DISTINCTION') return `${level} Distinction`
      if (result === 'PASS') return `${level} Pass`
      return level
    }
  }
  const n = parseDecimal(trimmed)
  if (n === null) return trimmed
  if (test === 'IELTS' || test === 'Oxford ELLT') return n.toFixed(1).replace(/\.0$/, '.0')
  return String(n)
}

function rowCompleteness(fields: string[]): 'empty' | 'partial' | 'complete' {
  const filled = fields.map((f) => f.trim().length > 0)
  if (filled.every(Boolean)) return 'complete'
  if (filled.every((f) => !f)) return 'empty'
  return 'partial'
}

function parseTravelHistory(value: unknown): { ok: true; data: TravelHistoryEntry[] } | { ok: false; error: string } {
  if (value == null) return { ok: true, data: [] }
  if (!Array.isArray(value)) return { ok: false, error: 'Travel history must be a list of trips' }

  const entries: TravelHistoryEntry[] = []
  for (let i = 0; i < value.length; i += 1) {
    const row = value[i]
    if (!isRecord(row)) return { ok: false, error: `Travel history entry ${i + 1} is invalid` }
    const country = asTrimmed(row.country)
    const yearRaw = asTrimmed(row.year)
    const duration = asTrimmed(row.duration)
    const state = rowCompleteness([country, yearRaw, duration])
    if (state === 'empty') continue
    if (state === 'partial') {
      return {
        ok: false,
        error: `Travel history entry ${i + 1} is incomplete — country, year, and duration are all required`,
      }
    }
    const year = parseInteger(yearRaw)
    if (year === null || year < MIN_YEAR || year > MAX_VISIT_YEAR) {
      return {
        ok: false,
        error: `Travel history entry ${i + 1}: year must be between ${MIN_YEAR} and ${MAX_VISIT_YEAR}`,
      }
    }
    entries.push({ country, year, duration })
  }
  return { ok: true, data: entries }
}

function parseVisaRejections(value: unknown): { ok: true; data: VisaRejectionEntry[] } | { ok: false; error: string } {
  if (value == null) return { ok: true, data: [] }
  if (!Array.isArray(value)) return { ok: false, error: 'Visa rejection history must be a list' }

  const entries: VisaRejectionEntry[] = []
  for (let i = 0; i < value.length; i += 1) {
    const row = value[i]
    if (!isRecord(row)) return { ok: false, error: `Visa rejection entry ${i + 1} is invalid` }
    const applicationCountry = asTrimmed(row.applicationCountry)
    const visaCategoryCustom = asTrimmed(row.visaCategoryCustom)
    const visaCategoryRaw = asTrimmed(row.visaCategory)
    const visaCategory = visaCategoryRaw === 'Other' ? visaCategoryCustom : visaCategoryRaw
    const reason = asTrimmed(row.reason)
    const state = rowCompleteness([applicationCountry, visaCategory, reason])
    if (state === 'empty' && !visaCategoryRaw && !visaCategoryCustom) continue
    if (visaCategoryRaw === 'Other' && !visaCategoryCustom) {
      return {
        ok: false,
        error: `Visa rejection entry ${i + 1}: enter the visa category`,
      }
    }
    if (state === 'partial' || state === 'empty') {
      if (state === 'empty') continue
      return {
        ok: false,
        error: `Visa rejection entry ${i + 1} is incomplete — application country, visa category, and reason are all required`,
      }
    }
    entries.push({ applicationCountry, visaCategory, reason })
  }
  return { ok: true, data: entries }
}

function parseLanguageTests(value: unknown): { ok: true; data: LanguageTestScoreEntry[] } | { ok: false; error: string } {
  if (value == null) return { ok: true, data: [] }
  if (!Array.isArray(value)) return { ok: false, error: 'Language test scores must be a list' }

  const entries: LanguageTestScoreEntry[] = []
  for (let i = 0; i < value.length; i += 1) {
    const row = value[i]
    if (!isRecord(row)) return { ok: false, error: `Language test entry ${i + 1} is invalid` }
    const test = asTrimmed(row.test)
    const score = asTrimmed(row.score)
    const state = rowCompleteness([test, score])
    if (state === 'empty') continue
    if (state === 'partial') {
      return {
        ok: false,
        error: `Language test entry ${i + 1} is incomplete — select the test and enter its score`,
      }
    }
    if (!isScoredLanguageTest(test)) {
      return { ok: false, error: `Language test entry ${i + 1}: choose a supported test` }
    }
    const scoreError = validateLanguageScore(test, score)
    if (scoreError) {
      return { ok: false, error: `Language test entry ${i + 1}: ${scoreError}` }
    }
    entries.push({ test, score: normalizeLanguageScore(test, score) })
  }
  return { ok: true, data: entries }
}

export function parseAndValidateWalkInIntake(input: {
  interestedIn: string
  age: unknown
  lastEducation?: unknown
  educationPercentage?: unknown
  educationCompletionYear?: unknown
  travelHistory?: unknown
  visaRejectionHistory?: unknown
  languageTestScores?: unknown
  budget?: unknown
}): { ok: true; data: WalkInIntakePayload } | { ok: false; error: string } {
  const age = parseInteger(input.age)
  if (age === null || age < 1 || age > 100) {
    return { ok: false, error: 'Age is required and must be a whole number from 1 to 100' }
  }

  const studyVisa = isStudyVisa(input.interestedIn)
  const lastEducation = asTrimmed(input.lastEducation)
  const percentageRaw = asTrimmed(input.educationPercentage)
  const yearRaw = asTrimmed(input.educationCompletionYear)

  let lastEducationValue: string | null = null
  let educationPercentage: number | null = null
  let educationCompletionYear: number | null = null

  if (studyVisa) {
    if (!lastEducation) {
      return { ok: false, error: 'Last education is required for Study Visa inquiries' }
    }
    const percentage = parseDecimal(input.educationPercentage)
    if (percentage === null || percentage < 0 || percentage > 100) {
      return { ok: false, error: 'Percentage is required for Study Visa inquiries and must be between 0 and 100' }
    }
    const year = parseInteger(input.educationCompletionYear)
    if (year === null || year < MIN_YEAR || year > MAX_COMPLETION_YEAR) {
      return {
        ok: false,
        error: `Completion year is required for Study Visa inquiries and must be between ${MIN_YEAR} and ${MAX_COMPLETION_YEAR}`,
      }
    }
    lastEducationValue = lastEducation
    educationPercentage = percentage
    educationCompletionYear = year
  } else if (lastEducation || percentageRaw || yearRaw) {
    return { ok: false, error: 'Education details are only collected for Study Visa inquiries' }
  }

  const travel = parseTravelHistory(input.travelHistory)
  if (!travel.ok) return travel

  const rejections = parseVisaRejections(input.visaRejectionHistory)
  if (!rejections.ok) return rejections

  const tests = parseLanguageTests(input.languageTestScores)
  if (!tests.ok) return tests

  const budget = asTrimmed(input.budget)
  if (budget.length > 200) {
    return { ok: false, error: 'Budget must be 200 characters or fewer' }
  }

  return {
    ok: true,
    data: {
      age,
      lastEducation: lastEducationValue,
      educationPercentage,
      educationCompletionYear,
      travelHistory: travel.data,
      visaRejectionHistory: rejections.data,
      languageTestScores: tests.data,
      budget: budget || null,
    },
  }
}

export function draftsToTravelPayload(drafts: TravelHistoryDraft[]) {
  return drafts.map(({ country, year, duration }) => ({ country, year, duration }))
}

export function draftsToRejectionPayload(drafts: VisaRejectionDraft[]) {
  return drafts.map(({ applicationCountry, visaCategory, visaCategoryCustom, reason }) => ({
    applicationCountry,
    visaCategory,
    visaCategoryCustom,
    reason,
  }))
}

export function draftsToLanguageTestPayload(drafts: LanguageTestDraft[]) {
  return drafts.map(({ test, score }) => ({ test, score }))
}
