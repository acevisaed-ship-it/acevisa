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
    <div className="bg-texture relative flex h-full flex-col items-center justify-center overflow-y-auto bg-bg px-5 py-24 md:px-10">

      {/* ── Aspirational illustration layer ─────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">

        {/* Happy graduate — left side */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
          style={{
            position: 'absolute',
            bottom: '4%',
            left: '0%',
            width: 130,
            height: 'auto',
            animation: 'float-bob 7s ease-in-out infinite',
          }}
        >
          <img src="/happy graduate girl.svg" alt="" className="h-auto w-full object-contain opacity-20" />
        </motion.div>

        {/* Corporate man — right side */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.6 }}
          style={{
            position: 'absolute',
            bottom: '4%',
            right: '0%',
            width: 115,
            height: 'auto',
            animation: 'float-bob-delayed 8s ease-in-out infinite',
            animationDelay: '1s',
          }}
        >
          <img src="/corporate man.svg" alt="" className="h-auto w-full object-contain opacity-20" />
        </motion.div>

        {/* Graduation cap floating top-left */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          style={{
            position: 'absolute',
            top: '10%',
            left: '8%',
            width: 60,
            animation: 'float-bob 5s ease-in-out infinite',
            animationDelay: '0.5s',
          }}
        >
          <img src="/Graduation Cap.svg" alt="" className="w-full opacity-20" />
        </motion.div>

        {/* Globe on stand — top-right */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.7 }}
          style={{
            position: 'absolute',
            top: '8%',
            right: '6%',
            width: 70,
            animation: 'globe-spin 22s linear infinite',
            opacity: 0.15,
          }}
        >
          <img src="/Earth.svg" alt="" className="w-full" />
        </motion.div>

        {/* Stars — scattered aspirationally */}
        <div style={{ position: 'absolute', top: '18%', left: '18%', width: 26, animation: 'star-pulse 3.2s ease-in-out infinite' }}><img src="/Orange Star.svg" alt="" className="w-full opacity-30" /></div>
        <div style={{ position: 'absolute', top: '25%', right: '22%', width: 22, animation: 'star-pulse 4.5s ease-in-out infinite', animationDelay: '1s' }}><img src="/Blue Star.svg" alt="" className="w-full opacity-30" /></div>
        <div style={{ position: 'absolute', top: '55%', left: '12%', width: 18, animation: 'star-pulse 5.1s ease-in-out infinite', animationDelay: '2s' }}><img src="/Green star.svg" alt="" className="w-full opacity-25" /></div>
        <div style={{ position: 'absolute', top: '60%', right: '10%', width: 20, animation: 'star-pulse 3.8s ease-in-out infinite', animationDelay: '0.7s' }}><img src="/Orange Star.svg" alt="" className="w-full opacity-25" /></div>
        <div style={{ position: 'absolute', top: '40%', left: '35%', width: 15, animation: 'star-pulse 4.2s ease-in-out infinite', animationDelay: '1.8s' }}><img src="/Blue Star.svg" alt="" className="w-full opacity-20" /></div>

        {/* Paper plane floating top */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1 }}
          style={{
            position: 'absolute',
            top: '15%',
            left: '48%',
            width: 44,
            animation: 'float-bob-delayed 6s ease-in-out infinite',
            animationDelay: '2s',
          }}
        >
          <img src="/paper airplane.svg" alt="" className="w-full opacity-20" />
        </motion.div>
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
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-orange">
            let&apos;s begin
          </p>
          <h2 className="text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-tight text-blue lowercase">
            60 seconds to
            <br />
            your counselor
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-sm text-text/70">
            No spam. No calls without your permission. Just a conversation.
          </p>
        </motion.div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-4 text-base"
            >
              {loading ? 'submitting…' : 'meet my AI counselor →'}
            </Button>
          </form>
        </Card>

        <p className="mt-5 text-center text-xs text-text/50">
          Your data is private. We never share it. Ever.
        </p>
      </div>
    </div>
  )
}
