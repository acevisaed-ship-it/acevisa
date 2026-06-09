export const DEAL_STAGES = [
  'lead',
  'proposal',
  'agreement_signed',
  'in_progress',
  'completed',
  'lost',
] as const

export type DealStage = (typeof DEAL_STAGES)[number]

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: 'Lead',
  proposal: 'Proposal',
  agreement_signed: 'Agreement Signed',
  in_progress: 'In Progress',
  completed: 'Completed',
  lost: 'Lost',
}

export const DEAL_SERVICE_TYPES = [
  'study_visa',
  'work_abroad',
  'visit_immigration',
  'language_ielts',
] as const

export type DealServiceType = (typeof DEAL_SERVICE_TYPES)[number]

export const DEAL_SERVICE_LABELS: Record<DealServiceType, string> = {
  study_visa: 'Study Visa',
  work_abroad: 'Work Abroad',
  visit_immigration: 'Visit & Immigration',
  language_ielts: 'Language & IELTS',
}

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

export const PAYMENT_METHODS = [
  'bank_transfer',
  'cash',
  'easypaisa',
  'jazzcash',
  'other',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
  other: 'Other',
}

export const EXPENSE_CATEGORIES = ['salary', 'office', 'marketing', 'tools', 'other'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  salary: 'Salary',
  office: 'Office',
  marketing: 'Marketing',
  tools: 'Tools',
  other: 'Other',
}

export function formatPkr(amount: number) {
  return `PKR ${amount.toLocaleString('en-PK')}`
}
