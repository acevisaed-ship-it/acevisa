import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000

export async function GET() {
  const supabase = createAdminClient()

  const { data: existingMeetings } = await supabase
    .from('meetings')
    .select('scheduled_time, counselor_id')
    .eq('status', 'scheduled')
    .gte('scheduled_time', new Date().toISOString())

  const { data: counselors } = await supabase
    .from('counselors')
    .select('id, name')
    .eq('status', 'active')
    .limit(1)

  const counselor = counselors?.[0] || { id: 'default', name: 'Your Counselor' }

  const slots: { utc: string; pkt: string; label: string }[] = []
  const now = new Date()
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  for (let day = 0; day < 7; day++) {
    const pktBase = new Date(now.getTime() + PKT_OFFSET_MS)
    pktBase.setUTCDate(pktBase.getUTCDate() + day)
    const { year, month, day: pktDay, dayOfWeek } = {
      year: pktBase.getUTCFullYear(),
      month: pktBase.getUTCMonth(),
      day: pktBase.getUTCDate(),
      dayOfWeek: pktBase.getUTCDay(),
    }

    if (dayOfWeek === 0) continue

    for (let totalMinutes = 9 * 60; totalMinutes <= 17 * 60 + 30; totalMinutes += 30) {
      const hour = Math.floor(totalMinutes / 60)
      const minute = totalMinutes % 60
      const slotUTC = new Date(Date.UTC(year, month, pktDay, hour - 5, minute, 0, 0))

      if (slotUTC <= now) continue

      const isTaken = (existingMeetings || []).some((m) => {
        const diff = Math.abs(new Date(m.scheduled_time).getTime() - slotUTC.getTime())
        return diff < 30 * 60 * 1000
      })

      if (!isTaken) {
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
        const minuteStr = minute === 0 ? ':00' : ':30'

        slots.push({
          utc: slotUTC.toISOString(),
          pkt: `${year}-${month + 1}-${pktDay} ${hour}:${minute.toString().padStart(2, '0')} PKT`,
          label: `${dayNames[dayOfWeek]}, ${pktDay} ${monthNames[month]} — ${displayHour}${minuteStr} ${ampm} PKT`,
        })
      }
    }
  }

  return NextResponse.json({ slots, counselor })
}
