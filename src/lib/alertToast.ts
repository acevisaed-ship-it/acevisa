'use client'

import { playNotificationSound } from '@/lib/notificationSound'

export type AlertToast = {
  id: string
  title: string
  body?: string
  href?: string | null
}

type Listener = (toasts: AlertToast[]) => void

let toasts: AlertToast[] = []
const listeners = new Set<Listener>()
const seenIds = new Set<string>()

function emit() {
  const snapshot = toasts
  listeners.forEach((l) => l(snapshot))
}

export function pushAlertToast(toast: AlertToast, opts?: { silent?: boolean }) {
  if (seenIds.has(toast.id)) return
  seenIds.add(toast.id)
  if (seenIds.size > 80) {
    const first = seenIds.values().next().value
    if (first) seenIds.delete(first)
  }
  toasts = [...toasts.slice(-3), toast]
  if (!opts?.silent) {
    playNotificationSound(`toast:${toast.id}`)
  }
  emit()
}

export function dismissAlertToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function subscribeAlertToasts(listener: Listener) {
  listeners.add(listener)
  listener(toasts)
  return () => {
    listeners.delete(listener)
  }
}
