'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const languages = ['Urdu', 'English', 'Punjabi', 'Sindhi', 'Pashto'] as const
const services = ['Study Visa', 'Job Abroad', 'Visit Visa', 'Language & Test Prep'] as const
const languageTestOptions = [
  'IELTS', 'PTE', 'Duolingo', 'TOEFL', 'LanguageCert', 'Oxford ELLT', 'Other',
] as const
const popularDestinations = [
  'United Kingdom', 'Canada', 'Australia', 'Ireland', 'New Zealand',
  'USA', 'Malaysia', 'China', 'Cyprus',
] as const
const schengenCountries = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Czechia', 'Denmark', 'Estonia',
  'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Italy',
  'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
  'Norway', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain',
  'Sweden', 'Switzerland',
] as const
const OTHER = 'Other'

const inputCls = 'min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input'
const labelCls = 'mb-1 block text-xs font-medium text-white/60'

interface FormState {
  name: string
  phone: string
  email: string
  city: string
  language: (typeof languages)[number]
  interested_in: (typeof services)[number]
  language_test_interest: string
  language_test_interest_custom: string
  target_country: string
  target_country_custom: string
  counselorId: string
}

const emptyForm: FormState = {
  name: '',
  phone: '',
  email: '',
  city: '',
  language: 'Urdu',
  interested_in: 'Study Visa',
  language_test_interest: '',
  language_test_interest_custom: '',
  target_country: 'United Kingdom',
  target_country_custom: '',
  counselorId: '',
}

type SuccessState = {
  name: string
  clientCode: string
  counselorName: string | null
  emailSent: boolean
  loginPhone?: string
  tempPassword?: string
}

export function ReceptionistRegisterForm() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [counselors, setCounselors] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<SuccessState | null>(null)

  useEffect(() => {
    fetch('/api/receptionist/branch-counselors')
      .then((res) => res.json())
      .then((data) => setCounselors(data.counselors ?? []))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const resolvedCountry =
      form.target_country === OTHER
        ? form.target_country_custom.trim()
        : form.target_country

    const resolvedLanguageTest =
      form.interested_in === 'Language & Test Prep'
        ? form.language_test_interest === OTHER
          ? form.language_test_interest_custom.trim()
          : form.language_test_interest
        : undefined

    if (form.target_country === OTHER && !resolvedCountry) {
      setError('Please enter the target country')
      setLoading(false)
      return
    }

    if (
      form.interested_in === 'Language & Test Prep' &&
      (!form.language_test_interest ||
        (form.language_test_interest === OTHER && !resolvedLanguageTest))
    ) {
      setError('Please select or enter the language test type')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/receptionist/register-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email.trim() || undefined,
          city: form.city,
          language: form.language,
          interested_in: form.interested_in,
          target_country: resolvedCountry,
          language_test_interest: resolvedLanguageTest,
          counselorId: form.counselorId,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to register client')
        return
      }

      setSuccess({
        name: form.name,
        clientCode: data.clientCode,
        counselorName: data.referredCounselorName ?? null,
        emailSent: !!data.emailSent,
        loginPhone: data.loginPhone,
        tempPassword: data.tempPassword,
      })
      setForm(emptyForm)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card variant="dark" className="text-center">
        <p className="text-sm font-medium text-bg/70">Account created</p>
        <p className="mt-2 text-2xl font-bold text-bg">{success.name}</p>
        <p className="mt-1 font-mono text-lg font-bold text-orange">{success.clientCode}</p>
        {success.counselorName && (
          <p className="mt-2 text-sm text-bg/70">Referred to <span className="font-semibold">{success.counselorName}</span></p>
        )}
        {success.emailSent ? (
          <p className="mt-4 text-sm text-bg/60">
            A welcome email with their portal ID and login password has been sent.
          </p>
        ) : (
          <div className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-left text-sm text-bg/80">
            <p className="mb-2 font-medium text-bg">No email on file — share these login details with the client:</p>
            <p><span className="text-bg/50">Phone:</span> <span className="font-mono font-semibold">{success.loginPhone}</span></p>
            <p className="mt-1"><span className="text-bg/50">Temp password:</span> <span className="font-mono font-semibold text-orange">{success.tempPassword}</span></p>
            <p className="mt-2 text-xs text-bg/50">They can log in at the student portal with their phone number and this password.</p>
          </div>
        )}
        <Button className="mt-6" onClick={() => setSuccess(null)}>
          Register another client
        </Button>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl glass-card-md crisp-on-dark p-5 md:p-6">
      <div>
        <label className={labelCls}>Full name</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputCls}
          placeholder="Ayesha Malik"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Phone number</label>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputCls}
            placeholder="03XX XXXXXXX"
          />
        </div>
        <div>
          <label className={labelCls}>
            Email address <span className="font-normal text-white/40">(optional)</span>
          </label>
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputCls}
            placeholder="Leave blank if not available"
          />
          <p className="mt-1 text-[11px] text-white/35">
            Not required — can be added later on the client profile.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>City</label>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className={inputCls}
            placeholder="Lahore"
          />
        </div>
        <div>
          <label className={labelCls}>Preferred language</label>
          <select
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value as FormState['language'] })}
            className={inputCls}
          >
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Interested in</label>
          <select
            value={form.interested_in}
            onChange={(e) => {
              const interested_in = e.target.value as FormState['interested_in']
              setForm({
                ...form,
                interested_in,
                language_test_interest:
                  interested_in === 'Language & Test Prep' ? form.language_test_interest : '',
                language_test_interest_custom:
                  interested_in === 'Language & Test Prep' ? form.language_test_interest_custom : '',
              })
            }}
            className={inputCls}
          >
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {form.interested_in === 'Language & Test Prep' && (
            <div className="mt-3">
              <label className={labelCls}>Language test type</label>
              <select
                required
                value={form.language_test_interest}
                onChange={(e) => {
                  const language_test_interest = e.target.value
                  setForm({
                    ...form,
                    language_test_interest,
                    language_test_interest_custom:
                      language_test_interest === OTHER ? form.language_test_interest_custom : '',
                  })
                }}
                className={inputCls}
              >
                <option value="">Select test type…</option>
                {languageTestOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {form.language_test_interest === OTHER && (
                <input
                  required
                  value={form.language_test_interest_custom}
                  onChange={(e) =>
                    setForm({ ...form, language_test_interest_custom: e.target.value })
                  }
                  className={`${inputCls} mt-2`}
                  placeholder="Enter test name"
                />
              )}
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Target country</label>
          <select
            value={form.target_country}
            onChange={(e) => {
              const target_country = e.target.value
              setForm({
                ...form,
                target_country,
                target_country_custom: target_country === OTHER ? form.target_country_custom : '',
              })
            }}
            className={inputCls}
          >
            <optgroup label="Popular Destinations">
              {popularDestinations.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
            <optgroup label="Schengen Countries">
              {schengenCountries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
            <option value={OTHER}>{OTHER}</option>
          </select>
          {form.target_country === OTHER && (
            <input
              required
              value={form.target_country_custom}
              onChange={(e) => setForm({ ...form, target_country_custom: e.target.value })}
              className={`${inputCls} mt-2`}
              placeholder="Enter country name"
            />
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>Refer to counselor (optional)</label>
        <select
          value={form.counselorId}
          onChange={(e) => setForm({ ...form, counselorId: e.target.value })}
          className={inputCls}
        >
          <option value="">Leave unassigned (Admin will assign)</option>
          {counselors.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-400">{error}</p>
      )}

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? 'Creating account…' : 'Create client account'}
      </Button>
    </form>
  )
}
