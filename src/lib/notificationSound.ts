'use client'

// Shared module-level gate so the alert sound plays once per new
// notification even though NotificationBell is mounted twice at once
// (mobile header + desktop header in both AdminShell and DashboardShell).
// State lives only for the life of the page/tab — a fresh load never plays
// a sound for notifications that already existed before the page opened,
// only for ones that arrive afterward.

let primed = false
let lastSeenId: string | null = null
let audio: HTMLAudioElement | null = null

/**
 * Call on every notification poll with the newest notification's id (or null
 * if there are none). Returns true exactly once per genuinely new
 * notification, the first time any mounted bell observes it.
 */
export function shouldPlayForNewNotification(topId: string | null): boolean {
  if (!primed) {
    primed = true
    lastSeenId = topId
    return false
  }
  if (topId && topId !== lastSeenId) {
    lastSeenId = topId
    return true
  }
  return false
}

export function playNotificationSound() {
  try {
    if (!audio) {
      audio = new Audio('/sounds/notification-alert.wav')
      audio.volume = 0.6
    }
    // Restart from the beginning if it's already mid-playback.
    audio.currentTime = 0
    void audio.play().catch(() => {
      // Autoplay can be blocked before any user interaction — safe to ignore,
      // the visual badge/toast still shows the new notification.
    })
  } catch {
    // Non-fatal — sound is a nice-to-have on top of the visual indicator.
  }
}
