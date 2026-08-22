'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, MessageSquare, X } from 'lucide-react'
import {
  dismissAlertToast,
  subscribeAlertToasts,
  type AlertToast,
} from '@/lib/alertToast'
import { installNotificationSoundUnlock } from '@/lib/notificationSound'

const AUTO_DISMISS_MS = 8000
const EMAIL_POLL_MS = 60_000

function EmailInboxWatcher() {
  const primed = useRef(false)
  const lastUid = useRef(0)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch('/api/email/unseen')
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          connected?: boolean
          latest?: { uid: number; subject: string; from: string } | null
        }
        if (!data.connected || !data.latest) return
        const uid = Number(data.latest.uid)
        if (!uid) return
        if (!primed.current) {
          primed.current = true
          lastUid.current = uid
          return
        }
        if (uid <= lastUid.current) return
        lastUid.current = uid
        await fetch('/api/email/alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.latest),
        })
      } catch {
        // Inbox check is best-effort
      }
    }

    void check()
    const interval = window.setInterval(check, EMAIL_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return null
}

export function AlertToastHost({ watchEmail = true }: { watchEmail?: boolean }) {
  const router = useRouter()
  const [toasts, setToasts] = useState<AlertToast[]>([])

  useEffect(() => {
    installNotificationSoundUnlock()
    return subscribeAlertToasts(setToasts)
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismissAlertToast(t.id), AUTO_DISMISS_MS)
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts])

  return (
    <>
      {watchEmail && <EmailInboxWatcher />}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-16 z-[80] flex w-[min(100%-2rem,360px)] flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto rounded-[20px] border border-white/10 glass-card crisp-on-dark p-4 shadow-xl"
              role="status"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/20 text-orange">
                  {toast.title.toLowerCase().includes('email') ? (
                    <Mail size={16} />
                  ) : (
                    <MessageSquare size={16} />
                  )}
                </div>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    dismissAlertToast(toast.id)
                    if (toast.href) router.push(toast.href)
                  }}
                >
                  <p className="text-sm font-semibold text-white">{toast.title}</p>
                  {toast.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-white/60">{toast.body}</p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => dismissAlertToast(toast.id)}
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-white/40 hover:text-white"
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
