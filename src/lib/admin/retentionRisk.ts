/**
 * Shared retention-risk classification — single source of truth so HR
 * Analytics (src/app/api/admin/hr/analytics/route.ts) and the CEO Agent's
 * retention-risk-review playbook rule (src/app/api/cron/ceo-agent-daily-review)
 * can never drift apart on what counts as "high risk".
 */
export type RetentionRisk = 'low' | 'medium' | 'high'

export function computeRetentionRisk(
  dealCount: number,
  businessContributionPct: number,
  joinedMonthsAgo: number
): RetentionRisk {
  if (dealCount === 0 && joinedMonthsAgo > 3) return 'high'
  if (businessContributionPct < 5 && joinedMonthsAgo > 6) return 'medium'
  return 'low'
}
