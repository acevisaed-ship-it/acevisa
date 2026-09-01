'use client'

import { useEffect } from 'react'

const PING_INTERVAL_MS = 60_000

/** Pings the server every 60s while this tab is visible/focused, so "time
 * spent on portal" reflects real activity rather than just a clocked-in
 * window. Also keeps the Supabase session from going stale on long-lived
 * pages (front desk). Mounted in staff shells — safe across multiple tabs. */
export function PortalHeartbeat() {
  useEffect(() => {
    function ping() {
      if (document.visibilityState !== 'visible') return
      fetch('/api/counselor/heartbeat', { method: 'POST' }).catch(() => {
        // Best-effort — a missed ping just under-counts by a minute.
      })
    }

    ping()
    const interval = window.setInterval(ping, PING_INTERVAL_MS)

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return null
}
