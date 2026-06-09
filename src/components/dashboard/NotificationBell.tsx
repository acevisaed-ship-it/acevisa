'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCheck,
  AlertCircle,
  Calendar,
  MessageSquare,
  Megaphone,
  UserCog,
  ShieldAlert,
} from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  is_read: boolean
  created_at: string
  client_id?: string
  task_id?: string
  meeting_id?: string
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  panic: <ShieldAlert size={16} className="text-red-500" />,
  escalation: <AlertCircle size={16} className="text-[#E48328]" />,
  meeting_request: <Calendar size={16} className="text-[#2083B9]" />,
  task_due: <AlertCircle size={16} className="text-[#E48328]" />,
  complaint: <Megaphone size={16} className="text-red-400" />,
  profile_update: <UserCog size={16} className="text-[#B7C733]" />,
  chat_message: <MessageSquare size={16} className="text-[#2083B9]" />,
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getNotificationHref(
  notification: Notification,
  context: 'admin' | 'counselor'
): string | null {
  const { type, client_id, meeting_id } = notification

  if (context === 'admin') {
    switch (type) {
      case 'chat_message':
        return client_id ? '/admin/unassigned' : null
      case 'panic':
      case 'meeting_request':
      case 'profile_update':
        return client_id ? `/admin/clients/${client_id}` : null
      case 'complaint':
        return '/admin/complaints'
      default:
        return null
    }
  }

  switch (type) {
    case 'chat_message':
    case 'panic':
    case 'profile_update':
      return client_id ? `/dashboard/clients/${client_id}` : null
    case 'meeting_request':
      if (meeting_id) return `/dashboard/brief/${meeting_id}`
      return client_id ? `/dashboard/clients/${client_id}` : null
    case 'complaint':
      return client_id ? `/dashboard/clients/${client_id}` : null
    default:
      return null
  }
}

type Props = {
  counselorId: string
  context?: 'admin' | 'counselor'
}

export function NotificationBell({ counselorId, context = 'counselor' }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const fetchNotifications = async () => {
    const res = await fetch(`/api/notifications?counselorId=${counselorId}`)
    const data = await res.json()
    setNotifications(data.notifications || [])
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [counselorId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counselorId, markAllRead: true }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  const handleNotificationClick = async (notification: Notification) => {
    await markRead(notification.id)
    const href = getNotificationHref(notification, context)
    if (href) {
      setOpen(false)
      router.push(href)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#0A3F3A]/10 hover:bg-[#0A3F3A]/20 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-[#0A3F3A]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E48328] text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[340px] rounded-2xl border border-[#0A3F3A]/12 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#0A3F3A]/10 px-4 py-3">
            <span className="font-bold text-[#0A3F3A]">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[#2083B9] hover:underline"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#0A3F3A]/50">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex gap-3 px-4 py-3 border-b border-[#0A3F3A]/6 cursor-pointer hover:bg-[#E6E8E7]/40 transition-colors ${
                    !n.is_read ? 'bg-[#E6E8E7]/60' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {TYPE_ICONS[n.type] || <Bell size={16} className="text-[#0A3F3A]/40" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${!n.is_read ? 'font-semibold text-[#0A3F3A]' : 'text-[#0A3F3A]/80'}`}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 truncate text-xs text-[#0A3F3A]/60">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-[#0A3F3A]/40">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#E48328]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
