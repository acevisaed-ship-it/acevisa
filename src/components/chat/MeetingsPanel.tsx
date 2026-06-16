'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, Calendar, Clock,
  CheckCircle2, XCircle, User, MapPin, Phone, Globe, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Meeting = {
  id: string
  scheduled_time: string
  status: 'scheduled' | 'completed' | 'cancelled'
  counselor_id: string
}

type ClientData = {
  name: string
  phone: string
  email: string | null
  city: string | null
  target_country: string | null
  interested_in: string | null
  pipeline_stage: number
}

type Props = {
  clientId: string
  client: ClientData | null
  counselorName: string | null
  meetings: Meeting[]
  onRequestMeeting: () => void
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
  }
}

const glassPanel = {
  background: 'rgba(238,238,237,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
} as React.CSSProperties

export function MeetingsPanel({ clientId, client, counselorName, meetings, onRequestMeeting }: Props) {
  const [meetingsOpen, setMeetingsOpen] = useState(true)

  const upcoming = meetings.filter((m) => m.status === 'scheduled')
  const past = meetings.filter((m) => m.status !== 'scheduled')

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">

      {/* ── Meetings card ── */}
      <div className="rounded-2xl p-3" style={glassPanel}>
        {/* Header */}
        <button
          type="button"
          onClick={() => setMeetingsOpen((o) => !o)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-white/60" />
            <span className="text-sm font-semibold text-white">Meetings</span>
            {upcoming.length > 0 && (
              <span className="rounded-full bg-green-400/20 px-1.5 py-0.5 text-[10px] font-bold text-green-300">
                {upcoming.length}
              </span>
            )}
          </div>
          {meetingsOpen
            ? <ChevronUp className="h-4 w-4 text-white/40" />
            : <ChevronDown className="h-4 w-4 text-white/40" />
          }
        </button>

        {meetingsOpen && (
          <div className="mt-3 flex flex-col gap-2">
            {/* Upcoming */}
            {upcoming.length === 0 && past.length === 0 && (
              <p className="text-xs text-white/40">No meetings yet.</p>
            )}

            {upcoming.map((m) => {
              const { date, time } = formatDateTime(m.scheduled_time)
              return (
                <div
                  key={m.id}
                  className="rounded-xl p-2.5"
                  style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold text-green-300">Upcoming</p>
                      <p className="text-xs text-white/80">{date}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/50">
                        <Clock className="h-3 w-3" />
                        {time}
                      </div>
                    </div>
                    <a
                      href={`/schedule/${clientId}`}
                      className="shrink-0 rounded-full bg-green-400/20 px-2.5 py-1 text-[10px] font-bold text-green-300 transition-colors hover:bg-green-400/30"
                    >
                      View →
                    </a>
                  </div>
                </div>
              )
            })}

            {/* Past (collapsed list) */}
            {past.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Past</p>
                {past.slice(0, 3).map((m) => {
                  const { date, time } = formatDateTime(m.scheduled_time)
                  const Icon = m.status === 'completed' ? CheckCircle2 : XCircle
                  const colour = m.status === 'completed' ? 'text-white/50' : 'text-orange/50'
                  return (
                    <div key={m.id} className="flex items-center gap-2 px-1">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${colour}`} />
                      <div className="min-w-0">
                        <p className="truncate text-[10px] text-white/60">{date} · {time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Schedule new */}
            <Button
              onClick={onRequestMeeting}
              className="mt-1 flex w-full items-center justify-center gap-1.5 py-2 text-xs"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Request a Meeting
            </Button>
          </div>
        )}
      </div>

      {/* ── Student profile card ── */}
      {client && (
        <div className="rounded-2xl p-3" style={glassPanel}>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{client.name}</p>
              {counselorName && (
                <p className="truncate text-[10px] text-white/40">
                  With <span className="text-white/60">{counselorName}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {client.city && (
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <MapPin className="h-3 w-3 shrink-0 text-white/30" />
                {client.city}
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <Phone className="h-3 w-3 shrink-0 text-white/30" />
                {client.phone}
              </div>
            )}
            {client.target_country && (
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <Globe className="h-3 w-3 shrink-0 text-white/30" />
                {client.target_country}
              </div>
            )}
            {client.interested_in && (
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <User className="h-3 w-3 shrink-0 text-white/30" />
                {client.interested_in}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
