'use client'

import { useEffect, useState } from 'react'
import {
  CORRECTABLE_FIELDS,
  type CorrectableField,
} from '@/lib/receptionist/clientForm'
import {
  OTHER,
  languageTestOptions,
  languages,
  popularDestinations,
  schengenCountries,
  services,
} from '@/lib/receptionist/intakeOptions'

const inputCls = 'min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input disabled:opacity-50'
const labelCls = 'mb-1 block text-xs font-medium text-green'

export type IntakeValues = Record<CorrectableField, string>

type Props = {
  values: IntakeValues
  onChange: (field: CorrectableField, value: string) => void
  editableFields?: CorrectableField[]
}

function inList(value: string, list: readonly string[]) {
  return list.includes(value)
}

function isKnownCountry(value: string) {
  return inList(value, popularDestinations) || inList(value, schengenCountries)
}

export function emptyIntakeValues(): IntakeValues {
  return {
    name: '',
    phone: '',
    email: '',
    city: '',
    language: 'Urdu',
    interested_in: 'Study Visa',
    target_country: 'United Kingdom',
    language_test_interest: '',
  }
}

export function ClientIntakeEditor({ values, onChange, editableFields }: Props) {
  const canEdit = (field: CorrectableField) =>
    !editableFields || editableFields.includes(field)

  const [countrySelect, setCountrySelect] = useState(() => {
    if (isKnownCountry(values.target_country)) return values.target_country
    if (values.target_country) return OTHER
    return 'United Kingdom'
  })
  const [testSelect, setTestSelect] = useState(() => {
    if (inList(values.language_test_interest, languageTestOptions)) return values.language_test_interest
    if (values.language_test_interest) return OTHER
    return ''
  })

  useEffect(() => {
    if (isKnownCountry(values.target_country)) {
      setCountrySelect(values.target_country)
    } else if (values.target_country) {
      setCountrySelect(OTHER)
    }
  }, [values.target_country])

  useEffect(() => {
    if (inList(values.language_test_interest, languageTestOptions)) {
      setTestSelect(values.language_test_interest)
    } else if (values.language_test_interest) {
      setTestSelect(OTHER)
    } else if (values.interested_in !== 'Language & Test Prep') {
      setTestSelect('')
    }
  }, [values.language_test_interest, values.interested_in])

  const countryIsOther = countrySelect === OTHER
  const testIsOther = testSelect === OTHER

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Full name</label>
        <input
          required
          disabled={!canEdit('name')}
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Phone number</label>
          <input
            required
            type="tel"
            disabled={!canEdit('phone')}
            value={values.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            Email address <span className="font-normal text-orange">(optional)</span>
          </label>
          <input
            type="text"
            inputMode="email"
            disabled={!canEdit('email')}
            value={values.email}
            onChange={(e) => onChange('email', e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>City</label>
          <input
            disabled={!canEdit('city')}
            value={values.city}
            onChange={(e) => onChange('city', e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Preferred language</label>
          <select
            disabled={!canEdit('language')}
            value={values.language || 'Urdu'}
            onChange={(e) => onChange('language', e.target.value)}
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
            disabled={!canEdit('interested_in')}
            value={values.interested_in || 'Study Visa'}
            onChange={(e) => {
              const interested_in = e.target.value
              onChange('interested_in', interested_in)
              if (interested_in !== 'Language & Test Prep') {
                onChange('language_test_interest', '')
              }
            }}
            className={inputCls}
          >
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {values.interested_in === 'Language & Test Prep' && (
            <div className="mt-3">
              <label className={labelCls}>Language test type</label>
              <select
                disabled={!canEdit('language_test_interest')}
                value={testSelect}
                onChange={(e) => {
                  const next = e.target.value
                  setTestSelect(next)
                  onChange('language_test_interest', next === OTHER ? '' : next)
                }}
                className={inputCls}
              >
                <option value="">Select test type…</option>
                {languageTestOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {testSelect === OTHER && (
                <input
                  disabled={!canEdit('language_test_interest')}
                  value={testIsOther ? values.language_test_interest : ''}
                  onChange={(e) => onChange('language_test_interest', e.target.value)}
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
            disabled={!canEdit('target_country')}
            value={countrySelect}
            onChange={(e) => {
              const next = e.target.value
              setCountrySelect(next)
              onChange('target_country', next === OTHER ? '' : next)
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
          {countrySelect === OTHER && (
            <input
              disabled={!canEdit('target_country')}
              value={countryIsOther ? values.target_country : ''}
              onChange={(e) => onChange('target_country', e.target.value)}
              className={`${inputCls} mt-2`}
              placeholder="Enter country name"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function mergeIntakeValues(
  base: IntakeValues,
  patch: Partial<Record<CorrectableField, string>>
): IntakeValues {
  const next = { ...base }
  for (const field of CORRECTABLE_FIELDS) {
    if (patch[field] !== undefined) next[field] = patch[field] ?? ''
  }
  return next
}
