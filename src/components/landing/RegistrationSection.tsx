'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  type ServiceOption,
  useScrollStore,
} from '@/lib/stores/scrollStore'
import { triggerTransition } from '@/lib/stores/transitionStore'
import { LandingDecor } from './LandingDecor'

// ── Layout config — tweak sizes & positions here ──────────────────────────
const LAYOUT = {
  figureLeft:  { width: 'clamp(480px, 42vw, 720px)', bottom: '0%',  left: '-4%' },
  figureRight: { width: 'clamp(480px, 42vw, 720px)', bottom: '0%',  right: '-4%' },
  gradCap:     { width: 'clamp(100px, 12vw, 180px)', top: '7%',     left: '5%' },
  earth:       { width: 'clamp(180px, 20vw, 380px)', top: '3%',     right: '3%' },
  // Flying paper planes — animation drives horizontal movement; top sets lane
  flyPlane1:   { width: '90px', top: '32%', left: '0' },
  flyPlane2:   { width: '80px', top: '62%', left: '0' },
  // Floating accent plane
  floatPlane:  { width: '80px', top: '18%', left: '44%' },
}

const languages = ['Urdu', 'English', 'Punjabi', 'Sindhi', 'Pashto'] as const
const services: ServiceOption[] = [
  'Study Visa',
  'Job Abroad',
  'Visit Visa',
  'Language & Test Prep',
]

interface FormData {
  name: string
  phone: string
  email: string
  city: string
  language: string
  interested_in: ServiceOption
  ad_source: string
}

const inputClass =
  'min-h-[48px] w-full rounded-card border border-text/20 bg-bg px-4 py-3.5 text-base text-text placeholder:text-text/40 outline-none transition-colors duration-700 focus:border-blue'

export function RegistrationSection() {
  const selectedService = useScrollStore((s) => s.selectedService)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adSource, setAdSource] = useState('direct')
  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    city: '',
    language: 'Urdu',
    interested_in: 'Study Visa',
    ad_source: 'direct',
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref') || 'direct'
    setAdSource(ref)
    setForm((prev) => ({ ...prev, ad_source: ref }))
  }, [])

  useEffect(() => {
    if (selectedService) {
      setForm((prev) => ({ ...prev, interested_in: selectedService }))
    }
  }, [selectedService])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = { ...form, ad_source: adSource }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed. Please try again.')
        return
      }

      const { clientId } = data
      triggerTransition(() => {
        window.location.href = `/chat/${clientId}`
      })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-texture relative flex h-full flex-col items-center justify-start overflow-y-auto bg-bg px-4 py-10 md:justify-center md:px-10 md:py-24">

      {/* ── Aspirational illustration layer ─────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

        {/* Left figure — happy graduate girl, large, bleeds beyond form */}
        <LandingDecor
          src="/happy graduate girl.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.figureLeft.width,
            bottom: LAYOUT.figureLeft.bottom,
            left: LAYOUT.figureLeft.left,
            animation: 'float-bob 7s ease-in-out infinite',
          }}
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
        />

        {/* Right figure — corporate man, large */}
        <LandingDecor
          src="/corporate man.svg"
          hideBelowLg
          opacity={1}
          style={{
            width: LAYOUT.figureRight.width,
            bottom: LAYOUT.figureRight.bottom,
            right: LAYOUT.figureRight.right,
            animation: 'float-bob-delayed 8s ease-in-out infinite',
            animationDelay: '1s',
          }}
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.6 }}
        />

        {/* Graduation cap — top-left, larger */}
        <LandingDecor
          src="/Graduation Cap.svg"
          hideBelowMd
          opacity={1}
          style={{
            width: LAYOUT.gradCap.width,
            top: LAYOUT.gradCap.top,
            left: LAYOUT.gradCap.left,
            animation: 'float-bob 5s ease-in-out infinite',
            animationDelay: '0.5s',
          }}
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
        />

        {/* Earth globe — top-right, 5× larger */}
        <LandingDecor
          src="/Earth.svg"
          hideBelowMd
          opacity={1}
          style={{
            width: LAYOUT.earth.width,
            top: LAYOUT.earth.top,
            right: LAYOUT.earth.right,
            animation: 'globe-spin 22s linear infinite',
          }}
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.7 }}
        />

        {/* Flying paper plane 1 — left → right */}
        <LandingDecor
          src="/paper airplane.svg"
          hideBelowMd
          opacity={1}
          style={{
            width: LAYOUT.flyPlane1.width,
            top: LAYOUT.flyPlane1.top,
            left: LAYOUT.flyPlane1.left,
            animation: 'plane-fly-r 9s ease-in-out infinite',
            animationDelay: '1s',
          }}
        />

        {/* Flying paper plane 2 — right → left */}
        <LandingDecor
          src="/paper airplane.svg"
          hideBelowMd
          opacity={1}
          style={{
            width: LAYOUT.flyPlane2.width,
            top: LAYOUT.flyPlane2.top,
            left: LAYOUT.flyPlane2.left,
            animation: 'plane-fly-l 11s ease-in-out infinite',
            animationDelay: '4s',
          }}
        />

        {/* Floating accent plane */}
        <LandingDecor
          src="/paper airplane.svg"
          hideBelowMd
          opacity={1}
          style={{
            width: LAYOUT.floatPlane.width,
            top: LAYOUT.floatPlane.top,
            left: LAYOUT.floatPlane.left,
            animation: 'float-bob-delayed 6s ease-in-out infinite',
            animationDelay: '2s',
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1 }}
        />

        {/* Stars */}
        <LandingDecor
          src="/Orange Star.svg"
          size="star"
          className="left-[18%] top-[18%]"
          style={{ animation: 'star-pulse 3.2s ease-in-out infinite' }}
          opacity={1}
        />
        <LandingDecor
          src="/Blue Star.svg"
          size="star"
          className="right-[22%] top-[25%]"
          style={{ animation: 'star-pulse 4.5s ease-in-out infinite', animationDelay: '1s' }}
          opacity={1}
          hideBelowMd
        />
        <LandingDecor
          src="/Green star.svg"
          size="star"
          className="left-[12%] top-[55%]"
          style={{ animation: 'star-pulse 5.1s ease-in-out infinite', animationDelay: '2s' }}
          opacity={1}
          hideBelowMd
        />
        <LandingDecor
          src="/Orange Star.svg"
          size="star"
          className="right-[10%] top-[60%]"
          style={{ animation: 'star-pulse 3.8s ease-in-out infinite', animationDelay: '0.7s' }}
          opacity={1}
          hideBelowMd
        />
        <LandingDecor
          src="/Blue Star.svg"
          size="star"
          className="left-[35%] top-[40%]"
          style={{ animation: 'star-pulse 4.2s ease-in-out infinite', animationDelay: '1.8s' }}
          opacity={1}
          hideBelowMd
        />
      </div>
      {/* ── /Aspirational illustration layer ────────────────────── */}

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="mb-8 text-center"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-orange">
            let&apos;s begin
          </p>
          <h2 className="text-[clamp(1.7rem,6vw,3.5rem)] font-semibold leading-tight text-blue lowercase">
            60 seconds to
            <br />
            your counselor
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-xs text-text/70 md:mt-4 md:text-sm">
            No spam. No calls without your permission. Just a conversation.
          </p>
        </motion.div>

        <Card className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            {error && (
              <p className="rounded-card border border-text/20 bg-bg px-4 py-3 text-sm text-text">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text">
                Full name
              </label>
              <input
                id="name"
                type="text"
                required
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-text">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                required
                placeholder="03XX XXXXXXX"
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="yourname@email.com"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-text">
                City
              </label>
              <input
                id="city"
                type="text"
                required
                className={inputClass}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="language" className="mb-1.5 block text-sm font-medium text-text">
                Preferred language
              </label>
              <select
                id="language"
                required
                className={inputClass}
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="interested_in" className="mb-1.5 block text-sm font-medium text-text">
                Interested in
              </label>
              <select
                id="interested_in"
                required
                className={inputClass}
                value={form.interested_in}
                onChange={(e) =>
                  setForm({
                    ...form,
                    interested_in: e.target.value as ServiceOption,
                  })
                }
              >
                {services.map((svc) => (
                  <option key={svc} value={svc}>
                    {svc}
                  </option>
                ))}
              </select>
            </div>

            <input type="hidden" name="ad_source" value={adSource} />

            {/* Sticky submit on mobile so CTA stays reachable while scrolling fields */}
            <div className="sticky bottom-0 -mx-4 border-t border-text/10 bg-bg/95 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-3 backdrop-blur-sm md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-base"
              >
                {loading ? 'submitting…' : 'meet my AI counselor →'}
              </Button>
            </div>
          </form>
        </Card>

        <p className="mt-5 text-center text-xs text-text/50">
          Your data is private. We never share it. Ever.
        </p>
      </div>
    </div>
  )
}
