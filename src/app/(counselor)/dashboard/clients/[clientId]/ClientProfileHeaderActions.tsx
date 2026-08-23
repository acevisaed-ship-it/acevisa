'use client'

import Link from 'next/link'
import { OnlineStatusToggle } from '@/components/brief/OnlineStatusToggle'
import { CopyPortalLink } from '@/components/CopyPortalLink'
import { usePageHeaderActions } from '@/components/dashboard/PageHeaderActionsContext'

type Props = {
  clientId: string
  chatHref: string
  counselorId?: string
  initialOnline?: boolean
  initialAutoReply?: boolean
}

function ActionsRow({ clientId, chatHref, counselorId, initialOnline, initialAutoReply }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {counselorId && (
        <OnlineStatusToggle
          counselorId={counselorId}
          initialOnline={initialOnline ?? false}
          initialAutoReply={initialAutoReply ?? false}
        />
      )}
      <Link
        href={chatHref}
        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(145deg, #f5a24e 0%, #E48328 55%, #ca7220 100%)' }}
      >
        💬 Chat with Student
      </Link>
      <CopyPortalLink clientId={clientId} />
    </div>
  )
}

/** Injects the online-toggle / chat / copy-link row into the shell's top
 * header bar (next to the notification bell) on desktop, and renders the
 * same row inline on mobile where the shared header has no room for it. */
export function ClientProfileHeaderActions(props: Props) {
  usePageHeaderActions(<ActionsRow {...props} />)
  return (
    <div className="mb-4 lg:hidden">
      <ActionsRow {...props} />
    </div>
  )
}
