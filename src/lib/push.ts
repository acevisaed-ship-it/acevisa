import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/server'

let configured = false

function ensureConfigured() {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@aceyourvisa.com'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export type PushPayload = {
  title: string
  body?: string
  href?: string
  tag?: string
}

/** Sends a Web Push notification to every subscribed device for this
 * counselor. Silently no-ops if VAPID keys aren't configured (push is
 * best-effort on top of the in-app bell, never load-bearing). Prunes
 * subscriptions the browser has revoked (410/404). */
export async function sendPushToCounselor(counselorId: string, payload: PushPayload) {
  if (!ensureConfigured()) return

  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('counselor_id', counselorId)

  if (!subs || subs.length === 0) return

  const body = JSON.stringify(payload)

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is dead (browser data cleared, uninstalled, etc.) — prune it.
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('[push] send failed:', err)
        }
      }
    })
  )
}
