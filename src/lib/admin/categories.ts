export const KB_CATEGORIES = [
  'Study Visa',
  'Work Abroad',
  'Visit & Immigration',
  'Language & IELTS',
  'General',
] as const

export type KbCategory = (typeof KB_CATEGORIES)[number]

export const CAMPAIGN_SERVICES = [
  'Study Visa',
  'Work Abroad',
  'Visit & Immigration',
  'Language & IELTS',
] as const

export type CampaignService = (typeof CAMPAIGN_SERVICES)[number]
