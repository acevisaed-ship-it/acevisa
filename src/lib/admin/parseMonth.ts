export function parseMonth(monthParam: string | null) {
  const now = new Date()
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : fallback
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, mon - 1, 1))
  const end = new Date(Date.UTC(year, mon, 1))
  const startDate = start.toISOString().slice(0, 10)
  const endDate = end.toISOString().slice(0, 10)
  return {
    month,
    start: start.toISOString(),
    end: end.toISOString(),
    startDate,
    endDate,
  }
}
