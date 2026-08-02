const MIN_RESPONSE_MS = 5000
const MAX_RESPONSE_MS = 10000

/** Random target between 5–10 seconds for a natural reply pace. */
export function humanResponseDelayMs(): number {
  return (
    MIN_RESPONSE_MS +
    Math.floor(Math.random() * (MAX_RESPONSE_MS - MIN_RESPONSE_MS + 1))
  )
}

/** Wait until at least 5–10 s have passed since `startedAt`. */
export async function waitForHumanResponseDelay(startedAt: number): Promise<void> {
  const remaining = humanResponseDelayMs() - (Date.now() - startedAt)
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining))
  }
}
