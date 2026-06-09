const MEETING_INTENT_KEYWORDS = [
  'book a meeting',
  'schedule a meeting',
  'book meeting',
  'schedule meeting',
  'want to meet',
  'can we meet',
  'i want a meeting',
  'set up a meeting',
  'arrange a meeting',
  'fix a meeting',
  'meeting on',
  'meeting at',
  'meet on',
  'meet at',
  'meet tomorrow',
  'meet today',
  'meet this',
  'meet me',
  'meet you',
  'available on',
  'free on',
  'book me',
  'book for',
  'مجھے ملنا ہے',
  'ملاقات',
  'میٹنگ',
]

const TIME_REFERENCE_KEYWORDS: (string | RegExp)[] = [
  'today',
  'tomorrow',
  'yesterday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'next week',
  'this week',
  'morning',
  'afternoon',
  'evening',
  'am',
  'pm',
  /\d{1,2}(:\d{2})?\s*(am|pm)/i,
  /\d{1,2}\s*(بجے)/,
]

export function hasMeetingIntent(message: string): boolean {
  const lower = message.toLowerCase()
  const hasIntent = MEETING_INTENT_KEYWORDS.some((kw) => lower.includes(kw))
  const hasTime = TIME_REFERENCE_KEYWORDS.some((kw) =>
    typeof kw === 'string' ? lower.includes(kw) : kw.test(message)
  )
  return hasIntent && hasTime
}
