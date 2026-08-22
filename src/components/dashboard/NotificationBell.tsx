'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  ClipboardList,
  Clock,
  UserX,
  CheckCircle2,
  PauseCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  installNotificationSoundUnlock,
  playNotificationSound,
  shouldPlayForNewNotification,
  unlockNotificationSound,
} from '@/lib/notificationSound'

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
  task_assigned: <ClipboardList size={16} className="text-[#2083B9]" />,
  complaint: <Megaphone size={16} className="text-red-400" />,
  profile_update: <UserCog size={16} className="text-[#B7C733]" />,
  correction_request: <UserCog size={16} className="text-[#E48328]" />,
  chat_message: <MessageSquare size={16} className="text-[#2083B9]" />,
  task_overdue: <AlertCircle size={16} className="text-red-400" />,
  task_completed: <CheckCircle2 size={16} className="text-[#B7C733]" />,
  task_pending: <PauseCircle size={16} className="text-[#E48328]" />,
  attendance_late: <Clock size={16} className="text-[#E48328]" />,
  attendance_absent: <UserX size={16} className="text-red-400" />,
  leave_submitted: <ClipboardList size={16} className="text-[#2083B9]" />,
  leave_reviewed: <ClipboardList size={16} className="text-[#B7C733]" />,
  daily_followup: <ClipboardList size={16} className="text-[#E48328]" />,
  team_message: <MessageSquare size={16} className="text-[#B7C733]" />,
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
      case 'correction_request':
        return '/admin/correction-requests'
      case 'complaint':
        return '/admin/complaints'
      case 'task_assigned':
        return '/admin/my-tasks'
      case 'task_overdue':
      case 'task_completed':
      case 'task_pending':
        return client_id ? `/admin/clients/${client_id}` : null
      case 'attendance_late':
      case 'attendance_absent':
      case 'leave_submitted':
        return '/admin/hr'
      case 'client_removed':
        return client_id ? `/admin/clients/${client_id}` : '/admin/clients'
      case 'daily_followup':
        return '/admin/counselors'
      case 'team_message':
        return '/admin/hub'
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
    case 'task_assigned':
    case 'task_overdue':
      return '/dashboard/tasks'
    case 'attendance_late':
    case 'attendance_absent':
      return '/dashboard/attendance'
    case 'leave_reviewed':
      return '/dashboard/attendance'
    case 'client_removed':
      return null
    case 'daily_followup':
    case 'task_pending':
    case 'task_completed':
      return '/dashboard/tasks'
    case 'team_message':
      return '/dashboard/hub'
    default:
      return null
  }
}

type Props = {
  counselorId: string
  context?: 'admin' | 'counselor'
  variant?: 'light' | 'dark'
}

export function NotificationBell({ counselorId, context = 'counselor', variant = 'light' }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    const res = await fetch(`/api/notifications?counselorId=${counselorId}`)
    const data = await res.json()
    const list: Notification[] = data.notifications || []
    setNotifications(list)

    // List is ordered newest-first, so list[0] is always the latest arrival.
    if (shouldPlayForNewNotification(list[0]?.id ?? null)) {
      playNotificationSound(`notif:${list[0].id}`)
    }
  }, [counselorId])

  useEffect(() => {
    installNotificationSoundUnlock()
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 8000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`staff-alerts-${context}-${variant}-${counselorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `counselor_id=eq.${counselorId}`,
        },
        (payload) => {
          const row = payload.new as Notification
          setNotifications((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]))
          playNotificationSound(`notif:${row.id}`)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages' },
        (payload) => {
          const row = payload.new as { id: string; sender_id: string }
          if (row.sender_id === counselorId) return
          playNotificationSound(`team:${row.id}`)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${counselorId}`,
        },
        (payload) => {
          const row = payload.new as { id: string }
          playNotificationSound(`dm:${row.id}`)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [counselorId, context, variant])

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
        onClick={() => {
          unlockNotificationSound()
          setOpen(!open)
        }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-80 ${
          variant === 'dark'
            ? 'text-white'
            : 'text-[#0A3F3A]'
        }`}
        style={{ background: 'linear-gradient(135deg, #f5a24e 0%, #E48328 100%)' }}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E48328] text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[340px] rounded-2xl border border-white/10 dark-modal shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="font-bold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-white/50 hover:text-white"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/40">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex gap-3 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                    !n.is_read ? 'bg-white/8' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {TYPE_ICONS[n.type] || <Bell size={16} className="text-white/30" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${!n.is_read ? 'font-semibold text-white' : 'text-white/70'}`}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 truncate text-xs text-white/50">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-white/30">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange" />
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
