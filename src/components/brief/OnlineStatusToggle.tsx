'use client'

import { useState } from 'react'

type Props = {
  counselorId: string
  initialOnline: boolean
  initialAutoReply: boolean
}

export function OnlineStatusToggle({
  counselorId,
  initialOnline,
  initialAutoReply,
}: Props) {
  const [isOnline, setIsOnline] = useState(initialOnline)
  const [autoReply, setAutoReply] = useState(initialAutoReply)
  const [saving, setSaving] = useState(false)

  const updateStatus = async (online: boolean, autoReplyEnabled: boolean) => {
    setSaving(true)
    try {
      await fetch('/api/counselor/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counselorId,
          isOnline: online,
          autoReplyEnabled: online ? autoReplyEnabled : false,
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleOnlineToggle = async () => {
    const next = !isOnline
    setIsOnline(next)
    if (!next) setAutoReply(false)
    await updateStatus(next, next ? autoReply : false)
  }

  const handleAutoReplyToggle = async () => {
    const next = !autoReply
    setAutoReply(next)
    await updateStatus(isOnline, next)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleOnlineToggle}
        disabled={saving}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
          isOnline ? 'bg-green text-text' : 'bg-text/20 text-text'
        }`}
      >
        {isOnline && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-text" />
          </span>
        )}
        {isOnline ? 'Online' : 'Offline'}
      </button>

      {isOnline && (
        <div className="group relative">
          <button
            type="button"
            onClick={handleAutoReplyToggle}
            disabled={saving}
            title="When ON, AI sends 'I'll get back to you shortly' to students who message while you're online"
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:opacity-60 ${
              autoReply ? 'bg-orange text-text' : 'bg-text/10 text-text/70'
            }`}
          >
            Auto-reply: {autoReply ? 'ON' : 'OFF'}
          </button>
          <span className="pointer-events-none absolute right-0 top-full z-10 mt-1 hidden w-48 rounded-lg bg-text px-3 py-2 text-xs text-bg group-hover:block">
            When ON, AI sends &ldquo;I&apos;ll get back to you shortly&rdquo; to students who
            message while you&apos;re online
          </span>
        </div>
      )}
    </div>
  )
}
