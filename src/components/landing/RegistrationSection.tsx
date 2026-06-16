'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  type ServiceOption,
  useScrollStore,
} from '@/lib/stores/scrollStore'
import { triggerTransition } from '@/lib/stores/transitionStore'
import { LandingDecor } from './LandingDecor'
import { SectionBeeOrangePlane } from './HeroAnimations'

// ── Layout config — tweak sizes & positions here ──────────────────────────
const LAYOUT = {
  // Graduate girl — left edge flush with viewport left edge
  figureLeft: {
    width:  'clamp(600px, 58vw, 920px)',
    bottom: '0%',
    left:   '0',
  },
  earth: { width: 'clamp(180px, 20vw, 380px)', top: '3%', right: '3%' },
}

const languages      = ['Urdu', 'English', 'Punjabi', 'Sindhi', 'Pashto'] as const
const services: ServiceOption[] = ['Study Visa', 'Job Abroad', 'Visit Visa', 'Language & Test Prep']
const targetCountries = [
  'United Kingdom', 'Canada', 'Australia', 'Ireland', 'New Zealand',
  'USA', 'Malaysia', 'China', 'Germany', 'Italy',
  'Switzerland', 'Sweden', 'Belgium', 'Austria', 'Hungary',
  'Romania', 'Latvia', 'Lithuania', 'Cyprus', 'Belarus',
]

interface FormData {
  name:           string
  phone:          string
  email:          string
  city:           string
  language:       string
  interested_in:  ServiceOption
  target_country: string
  ad_source:      string
}

// Desktop inputs: full height. Mobile inputs: compact.
const inputClass =
  'w-full rounded-card border border-text/20 bg-bg px-3 py-2 text-sm text-text placeholder:text-text/40 outline-none transition-colors duration-700 focus:border-blue min-h-[36px] md:min-h-[48px] md:px-4 md:py-3.5 md:text-base'
const labelClass = 'mb-1 block text-xs font-medium text-text md:mb-1.5 md:text-sm'

export function RegistrationSection() {
  const selectedService = useScrollStore((s) => s.selectedService)

  // ── Step management ────────────────────────────────────────────────────
  const [step, setStep]         = useState<'form' | 'password'>('form')
  const [clientId, setClientId] = useState<string | null>(null)

  // ── Form state ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [adSource, setAdSource] = useState('direct')
  const [form, setForm] = useState<FormData>({
    name:           '',
    phone:          '',
    email:          '',
    city:           '',
    language:       'Urdu',
    interested_in:  'Study Visa',
    target_country: 'United Kingdom',
    ad_source:      'direct',
  })

  // ── Password step state ────────────────────────────────────────────────
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError,         setPwError]         = useState<string | null>(null)
  const [pwLoading,       setPwLoading]       = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref') || 'direct'
    setAdSource(ref)
    setForm((prev) => ({ ...prev, ad_source: ref }))
  }, [])

  useEffect(() => {
    if (selectedService) setForm((prev) => ({ ...prev, interested_in: selectedService }))
  }, [selectedService])

  // ── Step 1: register ──────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('/api/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, ad_source: adSource }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed. Please try again.')
        return
      }

      setClientId(data.clientId)
      setStep('password')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: set password ──────────────────────────────────────────────
  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwError(null)

    if (password.length < 8) {
      setPwError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setPwError('Passwords do not match.')
      return
    }

    setPwLoading(true)
    try {
      const res  = await fetch('/api/set-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clientId, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setPwError(data.error || 'Failed to set password. Please try again.')
        return
      }

      triggerTransition(() => {
        window.location.href = `/chat/${clientId}`
      })
    } catch {
      setPwError('Something went wrong. Please try again.')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="bg-texture relative flex h-full flex-col items-center justify-center overflow-hidden bg-bg px-4 py-4 md:px-10 md:py-24">

      {/* ── Aspirational illustration layer ─────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

        {/* Graduate girl — right edge touches form left border */}
        <LandingDecor
          src="/happy graduate girl.svg"
          hideBelowLg
          opacity={1}
          style={{
            width:     LAYOUT.figureLeft.width,
            bottom:    LAYOUT.figureLeft.bottom,
            left:      LAYOUT.figureLeft.left,
            animation: 'float-bob 7s ease-in-out infinite',
          }}
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
        />

        {/* Earth globe — top-right */}
        <LandingDecor
          src="/Earth.svg"
          hideBelowMd
          opacity={1}
          style={{
            width:     LAYOUT.earth.width,
            top:       LAYOUT.earth.top,
            right:     LAYOUT.earth.right,
            animation: 'globe-spin 22s linear infinite',
          }}
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.7 }}
        />

        {/* Orange paper plane — 60fps bee physics */}
        <SectionBeeOrangePlane />

        {/* Stars */}
        <LandingDecor src="/Orange Star.svg" size="star" className="left-[18%] top-[18%]"
          style={{ animation: 'star-pulse 3.2s ease-in-out infinite' }} opacity={1} />
        <LandingDecor src="/Blue Star.svg"   size="star" className="right-[22%] top-[25%]"
          style={{ animation: 'star-pulse 4.5s ease-in-out infinite', animationDelay: '1s' }}
          opacity={1} hideBelowMd />
        <LandingDecor src="/Green star.svg"  size="star" className="left-[12%] top-[55%]"
          style={{ animation: 'star-pulse 5.1s ease-in-out infinite', animationDelay: '2s' }}
          opacity={1} hideBelowMd />
        <LandingDecor src="/Orange Star.svg" size="star" className="right-[10%] top-[60%]"
          style={{ animation: 'star-pulse 3.8s ease-in-out infinite', animationDelay: '0.7s' }}
          opacity={1} hideBelowMd />
        <LandingDecor src="/Blue Star.svg"   size="star" className="left-[35%] top-[40%]"
          style={{ animation: 'star-pulse 4.2s ease-in-out infinite', animationDelay: '1.8s' }}
          opacity={1} hideBelowMd />
      </div>
      {/* ── /Aspirational illustration layer ────────────────────── */}

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <AnimatePresence mode="wait">

          {/* ════════════════════════════════════════ STEP 1 — Registration form */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              {/* Heading — compact on mobile */}
              <div className="mb-2 text-center md:mb-8">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-orange md:mb-2 md:text-xs">
                  let&apos;s begin
                </p>
                <h2 className="text-xl font-semibold leading-tight text-blue lowercase md:text-[clamp(1.7rem,6vw,3.5rem)]">
                  60 seconds to your counselor
                </h2>
                <p className="mt-1 hidden text-xs text-text/70 md:mt-4 md:block md:text-sm">
                  No spam. No calls without your permission. Just a conversation.
                </p>
              </div>

              <Card className="p-3 md:p-6" style={{ background: 'rgba(238,238,237,0.25)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <form onSubmit={handleSubmit} className="space-y-2 md:space-y-4">
                  {error && (
                    <p className="rounded-card border border-text/20 bg-bg px-3 py-2 text-xs text-text md:px-4 md:py-3 md:text-sm">
                      {error}
                    </p>
                  )}

                  {/* Full name — full width */}
                  <div>
                    <label htmlFor="name" className={labelClass}>Full name</label>
                    <input id="name" type="text" required className={inputClass}
                      value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>

                  {/* Phone + City — 2-col on mobile */}
                  <div className="grid grid-cols-2 gap-2 md:contents">
                    <div>
                      <label htmlFor="phone" className={labelClass}>Phone</label>
                      <input id="phone" type="tel" required placeholder="03XX XXXXXXX" className={inputClass}
                        value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor="city" className={labelClass}>City</label>
                      <input id="city" type="text" required className={inputClass}
                        value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                  </div>

                  {/* Email — full width */}
                  <div>
                    <label htmlFor="email" className={labelClass}>Email</label>
                    <input id="email" type="email" required placeholder="yourname@email.com" className={inputClass}
                      value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>

                  {/* Language + Interested in — 2-col on mobile */}
                  <div className="grid grid-cols-2 gap-2 md:contents">
                    <div>
                      <label htmlFor="language" className={labelClass}>Language</label>
                      <select id="language" required className={inputClass}
                        value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                        {languages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="interested_in" className={labelClass}>Interested in</label>
                      <select id="interested_in" required className={inputClass}
                        value={form.interested_in}
                        onChange={(e) => setForm({ ...form, interested_in: e.target.value as ServiceOption })}>
                        {services.map((svc) => <option key={svc} value={svc}>{svc}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Target country — full width */}
                  <div>
                    <label htmlFor="target_country" className={labelClass}>Target country</label>
                    <select id="target_country" required className={inputClass}
                      value={form.target_country}
                      onChange={(e) => setForm({ ...form, target_country: e.target.value })}>
                      {targetCountries.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <input type="hidden" name="ad_source" value={adSource} />

                  <Button type="submit" disabled={loading} className="w-full py-2.5 text-sm md:py-4 md:text-base">
                    {loading ? 'submitting…' : 'meet my AI counselor →'}
                  </Button>
                </form>
              </Card>

              <p className="mt-2 hidden text-center text-xs text-text/50 md:mt-5 md:block">
                Your data is private. We never share it. Ever.
              </p>
            </motion.div>
          )}

          {/* ════════════════════════════════════════ STEP 2 — Set password */}
          {step === 'password' && (
            <motion.div
              key="password"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <div className="mb-8 text-center">
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-orange">
                  one last step
                </p>
                <h2 className="text-[clamp(1.7rem,6vw,3.5rem)] font-semibold leading-tight text-blue lowercase">
                  set your
                  <br />
                  login password
                </h2>
                <p className="mx-auto mt-3 max-w-sm text-xs text-text/70 md:mt-4 md:text-sm">
                  You&apos;ll use this to log back in and track your application.
                </p>
              </div>

              <Card className="p-4 md:p-6">
                <form onSubmit={handleSetPassword} className="space-y-3 md:space-y-4">
                  {pwError && (
                    <p className="rounded-card border border-text/20 bg-bg px-4 py-3 text-sm text-text">
                      {pwError}
                    </p>
                  )}

                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Min. 8 characters"
                      className={inputClass}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium text-text">
                      Retype password
                    </label>
                    <input
                      id="confirm_password"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Repeat your password"
                      className={inputClass}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div className="sticky bottom-0 -mx-4 border-t border-text/10 bg-bg/95 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-3 backdrop-blur-sm md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                    <Button type="submit" disabled={pwLoading} className="w-full py-4 text-base">
                      {pwLoading ? 'creating account…' : 'create my account →'}
                    </Button>
                  </div>
                </form>
              </Card>

              <p className="mt-5 text-center text-xs text-text/50">
                Your password is encrypted. We never store it in plain text.
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
