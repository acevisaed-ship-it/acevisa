export const APPLICATION_STATUSES = [
  'preparing', 'submitted', 'under_review', 'conditional_offer',
  'offer_received', 'enrolled', 'deferred', 'rejected', 'withdrawn',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  preparing: 'Preparing Application',
  submitted: 'Submitted',
  under_review: 'Under Review',
  conditional_offer: 'Conditional Offer',
  offer_received: 'Offer Received',
  enrolled: 'Enrolled',
  deferred: 'Deferred',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  preparing: '#2083B9',
  submitted: '#2083B9',
  under_review: '#E48328',
  conditional_offer: '#B7C733',
  offer_received: '#B7C733',
  enrolled: '#22c55e',
  deferred: '#94a3b8',
  rejected: '#ef4444',
  withdrawn: '#64748b',
}
