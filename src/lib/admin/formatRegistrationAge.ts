export function formatRegistrationAge(createdAt: string): { label: string; isStale: boolean } {
  const diff = Date.now() - new Date(createdAt).getTime()
  const mins = Math.floor(diff / 60000)

  if (mins < 1) {
    return { label: 'Registered: just now', isStale: false }
  }

  if (mins < 60) {
    return { label: `Registered: ${mins} minute${mins === 1 ? '' : 's'} ago`, isStale: false }
  }

  const hrs = Math.floor(mins / 60)

  if (hrs < 24) {
    return { label: `Registered: ${hrs} hour${hrs === 1 ? '' : 's'} ago`, isStale: false }
  }

  const days = Math.floor(hrs / 24)
  return {
    label: `Registered: ${days} day${days === 1 ? '' : 's'} ago`,
    isStale: true,
  }
}
