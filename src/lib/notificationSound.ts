'use client'

// Shared module-level gate so the alert sound plays once per new event even
// though NotificationBell is mounted twice (mobile header + desktop header).
// Browsers block audio until a user gesture — we unlock on the first click
// or keypress anywhere on the page, then later plays succeed.

let primed = false
let lastSeenId: string | null = null
let audio: HTMLAudioElement | null = null
let unlocked = false
let lastSoundAt = 0
let lastSoundKey: string | null = null
let unlockInstalled = false

const MIN_INTERVAL_MS = 1200

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!audio) {
    audio = new Audio('/sounds/notification-alert.wav')
    audio.preload = 'auto'
    audio.volume = 0.7
  }
  return audio
}

export function unlockNotificationSound() {
  const el = getAudio()
  if (!el || unlocked) return
  try {
    el.muted = true
    const play = el.play()
    if (play) {
      void play
        .then(() => {
          el.pause()
          el.currentTime = 0
          el.muted = false
          unlocked = true
        })
        .catch(() => {
          el.muted = false
        })
    }
  } catch {
    // Non-fatal
  }
}

export function installNotificationSoundUnlock() {
  if (typeof window === 'undefined' || unlockInstalled) return
  unlockInstalled = true
  const onGesture = () => unlockNotificationSound()
  window.addEventListener('pointerdown', onGesture)
  window.addEventListener('keydown', onGesture)
}

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

export function playNotificationSound(eventKey?: string) {
  const now = Date.now()
  if (eventKey) {
    if (eventKey === lastSoundKey && now - lastSoundAt < 5000) return
    lastSoundKey = eventKey
  }
  if (now - lastSoundAt < MIN_INTERVAL_MS) return
  lastSoundAt = now

  const el = getAudio()
  if (!el) return
  try {
    el.muted = false
    el.currentTime = 0
    void el.play().catch(() => {
      // Still locked — next user gesture will unlock.
      unlocked = false
    })
  } catch {
    // Non-fatal — sound is a nice-to-have on top of the visual indicator.
  }
}
