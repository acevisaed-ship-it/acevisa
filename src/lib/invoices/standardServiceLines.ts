export const STANDARD_SERVICE_LINES = {
  study: [
    'Counselling and programme shortlisting',
    'Admission application preparation and submission',
    'Document assessment and checklist',
    'Visa application file preparation',
    'Interview preparation',
    'Customer services during the application',
  ],
  visit: [
    'Document assessment (completeness and format check)',
    'Visa application file preparation',
    'Interview preparation',
    'Customer services during the application',
  ],
  other: [
    'Document assessment',
    'Application file or document preparation',
    'Appointment assistance (if included)',
    'Attestation or translation coordination (if included)',
  ],
  language: [
    'Test booking or voucher supply',
    'Class or guidance sessions (if included)',
  ],
} as const

export type ServiceLineKind = keyof typeof STANDARD_SERVICE_LINES

export function serviceLineKindForProduct(name: string): ServiceLineKind {
  const n = name.toLowerCase()
  if (n.includes('study')) return 'study'
  if (n.includes('visit')) return 'visit'
  if (
    n.includes('language') ||
    n.includes('voucher') ||
    n.includes('ielts') ||
    n.includes('pte') ||
    n.includes('toefl')
  ) {
    return 'language'
  }
  return 'other'
}

export function standardServiceLinesForProduct(name: string): string[] {
  return [...STANDARD_SERVICE_LINES[serviceLineKindForProduct(name)]]
}
