'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar, MapPin, Users } from 'lucide-react'
import { LandingDecor } from './LandingDecor'

const events = [
  {
    title: 'UK University Open Day — Lahore',
    date: 'July 5, 2026',
    time: '10:00 AM – 2:00 PM',
    location: 'Lahore, Pakistan',
    seats: '120 seats left',
    type: 'In-Person',
    color: 'var(--grad-blue)',
  },
  {
    title: 'Free IELTS Strategy Webinar',
    date: 'July 12, 2026',
    time: '7:00 PM – 8:30 PM',
    location: 'Online (Zoom)',
    seats: '300 seats left',
    type: 'Online',
    color: 'var(--grad-teal)',
  },
  {
    title: 'Canada Visa Q&A Session',
    date: 'July 19, 2026',
    time: '5:00 PM – 6:00 PM',
    location: 'Online (Zoom)',
    seats: '150 seats left',
    type: 'Online',
    color: 'var(--grad-orange)',
  },
  {
    title: 'Study Abroad Fair — Karachi',
    date: 'August 2, 2026',
    time: '11:00 AM – 5:00 PM',
    location: 'Karachi, Pakistan',
    seats: '200 seats left',
    type: 'In-Person',
    color: 'var(--grad-green)',
  },
]

export function EventsSection() {
  return (
    <div className="bg-texture relative flex h-full flex-col justify-center overflow-hidden bg-bg px-5 py-10 md:px-10 md:py-24">

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <LandingDecor
          src="/Green star.svg" size="star"
          className="right-[6%] top-[14%]"
          style={{ animation: 'star-pulse 4s ease-in-out infinite' }}
          opacity={0.25}
        />
        <LandingDecor
          src="/Blue Star.svg" size="star"
          className="left-[8%] top-[65%]"
          style={{ animation: 'star-pulse 5.2s ease-in-out infinite', animationDelay: '1s' }}
          opacity={0.25}
          hideBelowMd
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="mb-5 text-center md:mb-10"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-orange">
            join us
          </p>
          <h2 className="text-[clamp(1.75rem,6vw,3.5rem)] font-semibold leading-tight text-blue">
            Upcoming Events
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-text/70 md:mt-5 md:text-base">
            Free webinars, university fairs, and in-person sessions — join us and get your questions answered.
          </p>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
          {events.map((ev, i) => (
            <motion.div
              key={ev.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeInOut' }}
            >
              <Card
                variant="dark"
                className="flex h-full flex-col gap-3 p-5"
                style={{ background: ev.color }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    {ev.type}
                  </span>
                </div>
                <h3 className="text-sm font-semibold leading-snug text-white md:text-base">{ev.title}</h3>
                <div className="flex flex-col gap-1.5 text-xs text-white/70">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {ev.date} · {ev.time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {ev.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    {ev.seats}
                  </span>
                </div>
                <Button className="mt-auto w-full border-white/30 bg-white/15 py-2 text-xs text-white hover:bg-white/25 md:text-sm">
                  Register Free →
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
