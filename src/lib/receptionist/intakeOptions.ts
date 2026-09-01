export const languages = ['Urdu', 'English', 'Punjabi', 'Sindhi', 'Pashto'] as const
export const services = ['Study Visa', 'Job Abroad', 'Visit Visa', 'Language & Test Prep'] as const
export const STUDY_VISA = 'Study Visa' as const
export const languageTestOptions = [
  'IELTS', 'PTE', 'Duolingo', 'TOEFL', 'LanguageCert', 'Oxford ELLT', 'Other',
] as const
export const scoredLanguageTests = [
  'IELTS',
  'PTE',
  'TOEFL',
  'Oxford ELLT',
  'LanguageCert',
  'Duolingo English Test',
] as const
export const educationLevels = [
  'Matric / SSC',
  'O-Level',
  'Intermediate / HSSC',
  'A-Level',
  'Diploma',
  "Bachelor's",
  "Master's",
  'MPhil',
  'PhD',
  'Other',
] as const
export const visaCategories = [
  'Study Visa',
  'Visit Visa',
  'Work Visa',
  'Job Abroad',
  'Family / Spouse',
  'Transit',
  'Other',
] as const
export const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export const popularDestinations = [
  'United Kingdom', 'Canada', 'Australia', 'Ireland', 'New Zealand',
  'USA', 'Malaysia', 'China', 'Cyprus',
] as const
export const schengenCountries = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Czechia', 'Denmark', 'Estonia',
  'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Italy',
  'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
  'Norway', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain',
  'Sweden', 'Switzerland',
] as const
export const OTHER = 'Other'

export function displayLanguage(value: string | null | undefined): string {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function storeLanguage(value: string): string {
  return value.trim().toLowerCase()
}
