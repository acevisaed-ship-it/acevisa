'use client'

import { useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

/** Small opt-in banner offering OS-level push notifications (delivered even
 * with the tab/browser closed or minimized) via the Web Push API. Only shows
 * up when push is supported, VAPID is configured, and the user hasn't
 * already decided (granted/denied) or dismissed it this session. */
export function PushNotificationOptIn() {
  const [visible, setVisible] = useState(false)
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'default') return
    if (sessionStorage.getItem('push-opt-in-dismissed')) return

    setVisible(true)
  }, [])

  async function enable() {
    setEnabling(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setVisible(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      const json = subscription.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
    } catch (err) {
      console.warn('[push] subscribe failed:', err)
    } finally {
      setEnabling(false)
      setVisible(false)
    }
  }

  function dismiss() {
    sessionStorage.setItem('push-opt-in-dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex max-w-xs items-start gap-3 rounded-2xl border border-white/10 glass-card crisp-on-dark p-4 shadow-xl">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Turn on notifications?</p>
        <p className="mt-0.5 text-xs text-white/60">
          Get alerted for new tasks, messages and client updates even when this tab is closed.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={enable}
            disabled={enabling}
            className="min-h-[36px] rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {enabling ? 'Enabling…' : 'Enable'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-[36px] rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/20"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
