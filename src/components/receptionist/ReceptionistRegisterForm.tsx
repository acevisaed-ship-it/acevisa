'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ClientInfoForm } from '@/components/receptionist/ClientInfoForm'
import {
  WalkInIntakeExtras,
  type WalkInIntakeFormValues,
} from '@/components/receptionist/WalkInIntakeExtras'
import type { ClientFormSnapshot } from '@/lib/receptionist/clientForm'
import {
  languages,
  services,
  languageTestOptions,
  popularDestinations,
  schengenCountries,
  OTHER,
  STUDY_VISA,
} from '@/lib/receptionist/intakeOptions'
import {
  draftsToLanguageTestPayload,
  draftsToRejectionPayload,
  draftsToTravelPayload,
  isStudyVisa,
  parseAndValidateWalkInIntake,
} from '@/lib/receptionist/walkInIntake'

// Distinct from the shared .glass-input class on purpose — this form only
// ever renders inside RegisterFormCollapsible's dark panel now, so it gets
// its own tuned treatment (richer fill, lime focus ring tying back to the
// card's own header) rather than the generic dark-bg default used app-wide.
const inputCls =
  'min-h-[44px] w-full rounded-xl border border-green/50 bg-white/15 px-3 py-2 text-sm text-white outline-none placeholder:text-white/50 transition-colors focus:border-green focus:bg-white/20'
const labelCls = 'mb-1 block text-xs font-medium text-white/80'
// <select>'s own box picks up inputCls fine, but the dropdown *popup* list is
// rendered by the browser/OS, not by our CSS — it ignores the translucent
// bg-white/15 and falls back to a plain white list unless each <option> (and
// <optgroup>) is given its own solid, explicit background. bg-text/text-bg
// are the app's solid dark-teal-on-cream pair, closest match to this panel.
const optionCls = 'bg-text text-bg'

const emptyIntake = (): WalkInIntakeFormValues => ({
  lastEducation: '',
  lastEducationCustom: '',
  educationPercentage: '',
  educationCompletionYear: '',
  travelHistory: [],
  visaRejections: [],
  languageTests: [],
  budget: '',
})

interface FormState {
  name: string
  age: string
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
  intake: WalkInIntakeFormValues
}

function emptyForm(): FormState {
  return {
    name: '',
    age: '',
    phone: '',
    email: '',
    city: '',
    language: 'Urdu',
    interested_in: STUDY_VISA,
    language_test_interest: '',
    language_test_interest_custom: '',
    target_country: 'United Kingdom',
    target_country_custom: '',
    counselorId: '',
    intake: emptyIntake(),
  }
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
  const [form, setForm] = useState<FormState>(emptyForm())
  const [counselors, setCounselors] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [duplicateClient, setDuplicateClient] = useState<ClientFormSnapshot | null>(null)
  const [success, setSuccess] = useState<SuccessState | null>(null)

  useEffect(() => {
    fetch('/api/receptionist/branch-counselors', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setCounselors(data.counselors ?? []))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSessionExpired(false)
    setDuplicateClient(null)
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

    if (!form.city.trim()) {
      setError('City is required')
      setLoading(false)
      return
    }

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

    const lastEducation =
      form.intake.lastEducation === OTHER
        ? form.intake.lastEducationCustom.trim()
        : form.intake.lastEducation

    if (isStudyVisa(form.interested_in) && form.intake.lastEducation === OTHER && !lastEducation) {
      setError('Please enter the last education')
      setLoading(false)
      return
    }

    const intakeResult = parseAndValidateWalkInIntake({
      interestedIn: form.interested_in,
      age: form.age,
      lastEducation: isStudyVisa(form.interested_in) ? lastEducation : '',
      educationPercentage: isStudyVisa(form.interested_in) ? form.intake.educationPercentage : '',
      educationCompletionYear: isStudyVisa(form.interested_in) ? form.intake.educationCompletionYear : '',
      travelHistory: draftsToTravelPayload(form.intake.travelHistory),
      visaRejectionHistory: draftsToRejectionPayload(form.intake.visaRejections),
      languageTestScores: draftsToLanguageTestPayload(form.intake.languageTests),
      budget: form.intake.budget,
    })

    if (!intakeResult.ok) {
      setError(intakeResult.error)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/receptionist/register-client', {
        method: 'POST',
        credentials: 'include',
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
          age: intakeResult.data.age,
          lastEducation: intakeResult.data.lastEducation,
          educationPercentage: intakeResult.data.educationPercentage,
          educationCompletionYear: intakeResult.data.educationCompletionYear,
          travelHistory: intakeResult.data.travelHistory,
          visaRejectionHistory: intakeResult.data.visaRejectionHistory,
          languageTestScores: intakeResult.data.languageTestScores,
          budget: intakeResult.data.budget,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          setSessionExpired(true)
          setError(data.error || 'Your session expired. Please sign in again.')
          return
        }
        setError(data.error || 'Failed to register client')
        if (data.duplicateClient) setDuplicateClient(data.duplicateClient)
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
      setForm(emptyForm())
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* No repeated "Register a new client" title here — the collapsible
          shell above already announces it; this just adds the how-to-fill-
          it-out detail. */}
      <p className="text-xs text-white/65">
        Name, age, and city are always required. Email and history fields may be skipped. Education details
        appear only for Study Visa inquiries.
      </p>

      <div>
        <label className={labelCls}>
          Name <span className="font-normal text-orange">(required)</span>
        </label>
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
            Email <span className="font-normal text-white/60">(optional)</span>
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
          <p className="mt-1 text-[11px] text-white/55">
            Not required — can be added later on the client profile.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>
            Age <span className="font-normal text-orange">(required)</span>
          </label>
          <input
            required
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step="1"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className={inputCls}
            placeholder="e.g. 22"
          />
        </div>
        <div>
          <label className={labelCls}>
            City <span className="font-normal text-orange">(required)</span>
          </label>
          <input
            required
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className={inputCls}
            placeholder="Lahore"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Preferred language</label>
          <select
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value as FormState['language'] })}
            className={inputCls}
          >
            {languages.map((l) => (
              <option key={l} value={l} className={optionCls}>{l}</option>
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
              const keepEducation = isStudyVisa(interested_in)
              setForm({
                ...form,
                interested_in,
                language_test_interest:
                  interested_in === 'Language & Test Prep' ? form.language_test_interest : '',
                language_test_interest_custom:
                  interested_in === 'Language & Test Prep' ? form.language_test_interest_custom : '',
                intake: keepEducation
                  ? form.intake
                  : {
                      ...form.intake,
                      lastEducation: '',
                      lastEducationCustom: '',
                      educationPercentage: '',
                      educationCompletionYear: '',
                    },
              })
            }}
            className={inputCls}
          >
            {services.map((s) => (
              <option key={s} value={s} className={optionCls}>{s}</option>
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
                <option value="" className={optionCls}>Select test type…</option>
                {languageTestOptions.map((t) => (
                  <option key={t} value={t} className={optionCls}>{t}</option>
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
            <optgroup label="Popular Destinations" className={optionCls}>
              {popularDestinations.map((c) => (
                <option key={c} value={c} className={optionCls}>{c}</option>
              ))}
            </optgroup>
            <optgroup label="Schengen Countries" className={optionCls}>
              {schengenCountries.map((c) => (
                <option key={c} value={c} className={optionCls}>{c}</option>
              ))}
            </optgroup>
            <option value={OTHER} className={optionCls}>{OTHER}</option>
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
          <option value="" className={optionCls}>Leave unassigned (Admin will assign)</option>
          {counselors.map((c) => (
            <option key={c.id} value={c.id} className={optionCls}>{c.name}</option>
          ))}
        </select>
      </div>

      <WalkInIntakeExtras
        isStudyVisa={isStudyVisa(form.interested_in)}
        values={form.intake}
        onChange={(patch) => setForm({ ...form, intake: { ...form.intake, ...patch } })}
      />

      {error && (
        <p className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-400">
          {error}
          {sessionExpired && (
            <>
              {' '}
              <a href="/login" className="font-semibold underline">
                Sign in
              </a>
            </>
          )}
        </p>
      )}

      {duplicateClient && (
        <ClientInfoForm
          client={duplicateClient}
          title={`Existing client ${duplicateClient.client_code}`}
        />
      )}

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? 'Creating account…' : 'Create client account'}
      </Button>
    </form>
  )
}
