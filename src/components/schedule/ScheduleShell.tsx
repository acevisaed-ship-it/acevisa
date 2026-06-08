'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
type Slot = {
  utc: string
  pkt: string
  label: string
}

type Counselor = {
  id: string
  name: string
}

type DayOption = {
  dateKey: string
  dayName: string
  dayNum: number
}

type Props = {
  clientId: string
}

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function buildDayOptions(): DayOption[] {
  const now = new Date()
  const days: DayOption[] = []

  for (let i = 0; i < 7; i++) {
    const pktDate = new Date(now.getTime() + PKT_OFFSET_MS)
    pktDate.setUTCDate(pktDate.getUTCDate() + i)
    const dayOfWeek = pktDate.getUTCDay()
    if (dayOfWeek === 0) continue

    days.push({
      dateKey: `${pktDate.getUTCFullYear()}-${pktDate.getUTCMonth() + 1}-${pktDate.getUTCDate()}`,
      dayName: DAY_NAMES[dayOfWeek],
      dayNum: pktDate.getUTCDate(),
    })
  }

  return days
}

function getDateKeyFromPkt(pkt: string): string {
  return pkt.split(' ')[0]
}

function getPktTime(pkt: string): { hour: number; minute: number } {
  const timePart = pkt.split(' ')[1]
  const [hour, minute] = timePart.split(':').map(Number)
  return { hour, minute }
}

function formatTimeLabel(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const displayMinute = minute.toString().padStart(2, '0')
  return `${displayHour}:${displayMinute} ${ampm}`
}

function getSlotStyles(hour: number, minute: number): { backgroundColor: string; color: string } {
  const totalMins = hour * 60 + minute

  if (totalMins >= 9 * 60 && totalMins <= 11 * 60 + 30) {
    return { backgroundColor: '#2083B9', color: '#FFFFFF' }
  }
  if (totalMins >= 12 * 60 && totalMins <= 14 * 60 + 30) {
    return { backgroundColor: '#B7C733', color: '#0A3F3A' }
  }
  return { backgroundColor: '#E48328', color: '#0A3F3A' }
}

function isAfternoonSlot(hour: number, minute: number): boolean {
  const totalMins = hour * 60 + minute
  return totalMins >= 15 * 60 && totalMins <= 17 * 60 + 30
}

function sortSlots(a: Slot, b: Slot): number {
  const timeA = getPktTime(a.pkt)
  const timeB = getPktTime(b.pkt)
  return timeA.hour * 60 + timeA.minute - (timeB.hour * 60 + timeB.minute)
}

export function ScheduleShell({ clientId }: Props) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [counselor, setCounselor] = useState<Counselor | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dayOptions = useMemo(() => buildDayOptions(), [])

  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await fetch('/api/meetings/slots')
        const data = await res.json()
        setSlots(data.slots || [])
        setCounselor(data.counselor || null)
      } catch (err) {
        console.error('Failed to load slots:', err)
        setError('Could not load available times. Please refresh and try again.')
      } finally {
        setLoading(false)
      }
    }
    loadSlots()
  }, [])

  useEffect(() => {
    if (selectedDay || dayOptions.length === 0) return
    const firstDayWithSlots = dayOptions.find((day) =>
      slots.some((slot) => getDateKeyFromPkt(slot.pkt) === day.dateKey),
    )
    setSelectedDay(firstDayWithSlots?.dateKey ?? dayOptions[0].dateKey)
  }, [slots, dayOptions, selectedDay])

  const daySlots = useMemo(() => {
    if (!selectedDay) return []
    return slots.filter((slot) => getDateKeyFromPkt(slot.pkt) === selectedDay).sort(sortSlots)
  }, [slots, selectedDay])

  const afternoonSlots = useMemo(
    () => daySlots.filter((slot) => {
      const { hour, minute } = getPktTime(slot.pkt)
      return isAfternoonSlot(hour, minute)
    }),
    [daySlots],
  )

  const nonAfternoonSlots = useMemo(
    () => daySlots.filter((slot) => {
      const { hour, minute } = getPktTime(slot.pkt)
      return !isAfternoonSlot(hour, minute)
    }),
    [daySlots],
  )

  const handleDaySelect = (dateKey: string) => {
    setSelectedDay(dateKey)
    setSelectedSlot(null)
    setError(null)
  }

  const handleConfirm = async () => {
    if (!selectedSlot || !counselor) return

    setBooking(true)
    setError(null)

    try {
      const res = await fetch('/api/meetings/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          counselorId: counselor.id,
          scheduledTimeUTC: selectedSlot.utc,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Booking failed. Please try another slot.')
        if (res.status === 409) setSelectedSlot(null)
        return
      }

      setBooked(true)
    } catch (err) {
      console.error('Booking error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  const renderSlotButton = (slot: Slot) => {
    const { hour, minute } = getPktTime(slot.pkt)
    const styles = getSlotStyles(hour, minute)
    const isSelected = selectedSlot?.utc === slot.utc

    return (
      <button
        key={slot.utc}
        type="button"
        onClick={() => setSelectedSlot(slot)}
        className="min-h-[44px] rounded-full px-2 py-3 text-xs font-medium leading-tight transition-all"
        style={{
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          outline: isSelected ? '2px solid #FFFFFF' : 'none',
          outlineOffset: isSelected ? '2px' : undefined,
          boxShadow: isSelected ? '0 0 0 3px rgba(10, 63, 58, 0.35)' : undefined,
        }}
      >
        {formatTimeLabel(hour, minute)}
      </button>
    )
  }

  if (booked && selectedSlot && counselor) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg px-6 py-8 sm:max-w-2xl">
        <img src="/logo.png" alt="ACE Altius Consulting" className="mb-12 h-10 w-auto" />

        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-10 w-10 text-green"
              aria-hidden="true"
            >
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-blue">You&apos;re booked!</h1>
          <p className="text-base leading-relaxed text-text">
            Your counselor {counselor.name} will meet you on{' '}
            <span className="font-semibold">{selectedSlot.label}</span>. Check your messages for
            a confirmation.
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/'
            }}
            className="mt-4 min-h-[52px] w-full rounded-full bg-green py-4 text-base font-bold text-text"
          >
            Back to home →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg px-6 py-8 sm:max-w-2xl">
      <img src="/logo.png" alt="ACE Altius Consulting" className="mb-8 h-10 w-auto" />

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-blue">Pick your slot</h1>
        <p className="mt-2 text-sm leading-relaxed text-text">
          Choose a day, then pick a time that works for you.
        </p>
      </header>

      {counselor && (
        <div className="mb-6 flex w-full items-center gap-4 rounded-[20px] border border-text/12 bg-white/80 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green text-sm font-bold text-text">
            {getInitials(counselor.name)}
          </div>
          <div>
            <p className="font-bold text-text">{counselor.name}</p>
            <p className="text-xs text-blue">Your assigned counselor</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text/60">
          Step 1 — Pick a day
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {dayOptions.map((day) => {
            const isSelected = selectedDay === day.dateKey
            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => handleDaySelect(day.dateKey)}
                className="min-h-[44px] shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: isSelected ? '#0A3F3A' : '#E6E8E7',
                  border: '1px solid #0A3F3A',
                  color: isSelected ? '#FFFFFF' : '#0A3F3A',
                }}
              >
                {day.dayName} {day.dayNum}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="mb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text/60">
            Step 2 — Pick a time
          </p>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-full bg-bg"
                  style={{ border: '1px solid rgba(10,63,58,0.12)' }}
                />
              ))}
            </div>
          ) : daySlots.length === 0 ? (
            <p className="text-center text-sm text-text/70">
              No slots available on this day. Try another date.
            </p>
          ) : (
            <div className="space-y-4">
              {nonAfternoonSlots.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {nonAfternoonSlots.map(renderSlotButton)}
                </div>
              )}

              {afternoonSlots.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {afternoonSlots.map(renderSlotButton)}
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: '#0A3F3A' }}
                      aria-hidden="true"
                    />
                    <p
                      className="text-sm italic leading-snug"
                      style={{ color: '#0A3F3A' }}
                    >
                      Peak hours — slots fill up fast. Pick an earlier time to avoid missing out.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 text-center text-sm text-red-600">{error}</p>
      )}

      {selectedSlot && (
        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={booking}
            className="min-h-[52px] w-full rounded-full bg-green py-4 text-base font-bold text-text disabled:opacity-60"
          >
            {booking ? 'Booking...' : 'Confirm this time →'}
          </button>
        </div>
      )}
    </div>
  )
}
