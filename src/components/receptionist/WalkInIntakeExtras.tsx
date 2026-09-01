'use client'

import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  OTHER,
  cefrLevels,
  educationLevels,
  popularDestinations,
  schengenCountries,
  scoredLanguageTests,
  visaCategories,
} from '@/lib/receptionist/intakeOptions'
import {
  emptyLanguageTestDraft,
  emptyRejectionDraft,
  emptyTravelDraft,
  languageTestInputMeta,
  languageTestScoreHint,
  type LanguageTestDraft,
  type TravelHistoryDraft,
  type VisaRejectionDraft,
} from '@/lib/receptionist/walkInIntake'

const inputCls = 'min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input'
const labelCls = 'mb-1 block text-xs font-medium text-white/60'
const hintCls = 'mt-1 text-[11px] text-white/35'
const sectionCls = 'rounded-xl border border-white/10 p-4 space-y-3'

export type WalkInIntakeFormValues = {
  lastEducation: string
  lastEducationCustom: string
  educationPercentage: string
  educationCompletionYear: string
  travelHistory: TravelHistoryDraft[]
  visaRejections: VisaRejectionDraft[]
  languageTests: LanguageTestDraft[]
  budget: string
}

type Props = {
  isStudyVisa: boolean
  values: WalkInIntakeFormValues
  onChange: (patch: Partial<WalkInIntakeFormValues>) => void
}

function FieldMark({ kind }: { kind: 'required' | 'optional' | 'conditional' }) {
  const styles = {
    required: 'text-orange',
    optional: 'text-white/40',
    conditional: 'text-blue',
  }
  const labels = {
    required: 'Required',
    optional: 'Optional',
    conditional: 'Required for Study Visa',
  }
  return <span className={`font-normal ${styles[kind]}`}>({labels[kind]})</span>
}

function isKnownCountry(value: string) {
  return (popularDestinations as readonly string[]).includes(value)
    || (schengenCountries as readonly string[]).includes(value)
}

function CountrySelect({
  value,
  onChange,
  placeholder = 'Select country…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const known = isKnownCountry(value)
  const [selectValue, setSelectValue] = useState(() => {
    if (known) return value
    if (value) return OTHER
    return ''
  })

  useEffect(() => {
    if (known) setSelectValue(value)
    else if (value) setSelectValue(OTHER)
  }, [known, value])

  const customValue = known || selectValue !== OTHER ? '' : value

  return (
    <>
      <select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value
          setSelectValue(next)
          onChange(next === OTHER ? '' : next)
        }}
        className={inputCls}
      >
        <option value="">{placeholder}</option>
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
      {selectValue === OTHER && (
        <input
          value={customValue}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} mt-2`}
          placeholder="Enter country name"
        />
      )}
    </>
  )
}

function LanguageCertScoreInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const isCefr = (cefrLevels as readonly string[]).includes(value.toUpperCase())
  const [mode, setMode] = useState<'cefr' | 'academic' | ''>(() => {
    if (isCefr) return 'cefr'
    if (value) return 'academic'
    return ''
  })

  useEffect(() => {
    if (isCefr) setMode('cefr')
    else if (value) setMode('academic')
  }, [isCefr, value])

  const selectValue = mode === 'academic' ? '__academic__' : isCefr ? value.toUpperCase() : ''

  return (
    <>
      <select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value
          if (next === '__academic__') {
            setMode('academic')
            onChange(isCefr ? '' : value)
            return
          }
          setMode(next ? 'cefr' : '')
          onChange(next)
        }}
        className={inputCls}
      >
        <option value="">Select CEFR or Academic…</option>
        {cefrLevels.map((level) => (
          <option key={level} value={level}>{level}</option>
        ))}
        <option value="__academic__">Academic score (0–100)</option>
      </select>
      {mode === 'academic' && (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step="1"
          value={isCefr ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} mt-2`}
          placeholder="0–100"
        />
      )}
    </>
  )
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-green hover:bg-white/5"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  )
}

function RemoveRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/40 hover:bg-white/5 hover:text-orange"
      aria-label={label}
    >
      <X className="h-4 w-4" />
    </button>
  )
}

export function WalkInIntakeExtras({ isStudyVisa, values, onChange }: Props) {
  function patchTravel(id: string, patch: Partial<TravelHistoryDraft>) {
    onChange({
      travelHistory: values.travelHistory.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    })
  }

  function patchRejection(id: string, patch: Partial<VisaRejectionDraft>) {
    onChange({
      visaRejections: values.visaRejections.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    })
  }

  function patchTest(id: string, patch: Partial<LanguageTestDraft>) {
    onChange({
      languageTests: values.languageTests.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    })
  }

  return (
    <div className="space-y-4">
      {isStudyVisa && (
        <div className={sectionCls}>
          <p className="text-sm font-medium text-white">Study visa education</p>
          <p className={hintCls}>These three fields are required because this visitor is inquiring about a Study Visa.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>
                Last education <FieldMark kind="conditional" />
              </label>
              <select
                required
                value={values.lastEducation}
                onChange={(e) =>
                  onChange({
                    lastEducation: e.target.value,
                    lastEducationCustom: e.target.value === OTHER ? values.lastEducationCustom : '',
                  })
                }
                className={inputCls}
              >
                <option value="">Select last education…</option>
                {educationLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {values.lastEducation === OTHER && (
                <input
                  required
                  value={values.lastEducationCustom}
                  onChange={(e) => onChange({ lastEducationCustom: e.target.value })}
                  className={`${inputCls} mt-2`}
                  placeholder="Enter last education"
                />
              )}
            </div>
            <div>
              <label className={labelCls}>
                Percentage <FieldMark kind="conditional" />
              </label>
              <input
                required
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={values.educationPercentage}
                onChange={(e) => onChange({ educationPercentage: e.target.value })}
                className={inputCls}
                placeholder="e.g. 78.5"
              />
            </div>
            <div>
              <label className={labelCls}>
                Completion year <FieldMark kind="conditional" />
              </label>
              <input
                required
                type="number"
                inputMode="numeric"
                min={1950}
                max={new Date().getFullYear() + 1}
                step="1"
                value={values.educationCompletionYear}
                onChange={(e) => onChange({ educationCompletionYear: e.target.value })}
                className={inputCls}
                placeholder="e.g. 2023"
              />
            </div>
          </div>
        </div>
      )}

      <div className={sectionCls}>
        <div>
          <p className="text-sm font-medium text-white">
            Travel history (if any) <FieldMark kind="optional" />
          </p>
          <p className={hintCls}>
            Skip if the visitor has never travelled. If you add a trip, country, year, and duration must all be filled.
          </p>
        </div>
        {values.travelHistory.map((row, index) => (
          <div key={row.id} className="rounded-xl bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-white/50">Trip {index + 1}</p>
              <RemoveRowButton
                label={`Remove trip ${index + 1}`}
                onClick={() =>
                  onChange({ travelHistory: values.travelHistory.filter((r) => r.id !== row.id) })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Country of visit</label>
                <CountrySelect
                  value={row.country}
                  onChange={(country) => patchTravel(row.id, { country })}
                />
              </div>
              <div>
                <label className={labelCls}>Year of visit</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1950}
                  max={new Date().getFullYear()}
                  step="1"
                  value={row.year}
                  onChange={(e) => patchTravel(row.id, { year: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. 2019"
                />
              </div>
              <div>
                <label className={labelCls}>Duration of stay</label>
                <input
                  value={row.duration}
                  onChange={(e) => patchTravel(row.id, { duration: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. 2 weeks"
                />
              </div>
            </div>
          </div>
        ))}
        <AddRowButton
          label="Add trip"
          onClick={() => onChange({ travelHistory: [...values.travelHistory, emptyTravelDraft()] })}
        />
      </div>

      <div className={sectionCls}>
        <div>
          <p className="text-sm font-medium text-white">
            Visa rejection history (if any) <FieldMark kind="optional" />
          </p>
          <p className={hintCls}>
            Skip if there are no refusals. If you add a rejection, country, visa category, and reason must all be filled.
          </p>
        </div>
        {values.visaRejections.map((row, index) => (
          <div key={row.id} className="rounded-xl bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-white/50">Rejection {index + 1}</p>
              <RemoveRowButton
                label={`Remove rejection ${index + 1}`}
                onClick={() =>
                  onChange({ visaRejections: values.visaRejections.filter((r) => r.id !== row.id) })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Application country</label>
                <CountrySelect
                  value={row.applicationCountry}
                  onChange={(applicationCountry) => patchRejection(row.id, { applicationCountry })}
                />
              </div>
              <div>
                <label className={labelCls}>Category of visa</label>
                <select
                  value={row.visaCategory}
                  onChange={(e) =>
                    patchRejection(row.id, {
                      visaCategory: e.target.value,
                      visaCategoryCustom: e.target.value === OTHER ? row.visaCategoryCustom : '',
                    })
                  }
                  className={inputCls}
                >
                  <option value="">Select category…</option>
                  {visaCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {row.visaCategory === OTHER && (
                  <input
                    value={row.visaCategoryCustom}
                    onChange={(e) => patchRejection(row.id, { visaCategoryCustom: e.target.value })}
                    className={`${inputCls} mt-2`}
                    placeholder="Enter visa category"
                  />
                )}
              </div>
              <div>
                <label className={labelCls}>Reason for rejection</label>
                <input
                  value={row.reason}
                  onChange={(e) => patchRejection(row.id, { reason: e.target.value })}
                  className={inputCls}
                  placeholder="Stated reason if known"
                />
              </div>
            </div>
          </div>
        ))}
        <AddRowButton
          label="Add rejection"
          onClick={() => onChange({ visaRejections: [...values.visaRejections, emptyRejectionDraft()] })}
        />
      </div>

      <div className={sectionCls}>
        <div>
          <p className="text-sm font-medium text-white">
            IELTS / language test score (if available) <FieldMark kind="optional" />
          </p>
          <p className={hintCls}>
            Skip if the visitor has no score yet. If you add a test, both the test type and a valid score are required.
          </p>
        </div>
        {values.languageTests.map((row, index) => {
          const meta = languageTestInputMeta(row.test)
          return (
            <div key={row.id} className="rounded-xl bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-white/50">Test {index + 1}</p>
                <RemoveRowButton
                  label={`Remove test ${index + 1}`}
                  onClick={() =>
                    onChange({ languageTests: values.languageTests.filter((r) => r.id !== row.id) })
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Test</label>
                  <select
                    value={row.test}
                    onChange={(e) => patchTest(row.id, { test: e.target.value, score: '' })}
                    className={inputCls}
                  >
                    <option value="">Select test…</option>
                    {scoredLanguageTests.map((test) => (
                      <option key={test} value={test}>{test}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Score</label>
                  {row.test === 'LanguageCert' ? (
                    <LanguageCertScoreInput
                      value={row.score}
                      onChange={(score) => patchTest(row.id, { score })}
                    />
                  ) : (
                    <input
                      type={meta.inputMode === 'text' ? 'text' : 'number'}
                      inputMode={meta.inputMode}
                      step={meta.step}
                      min={meta.min}
                      max={meta.max}
                      value={row.score}
                      onChange={(e) => patchTest(row.id, { score: e.target.value })}
                      className={inputCls}
                      placeholder={row.test ? languageTestScoreHint(row.test) : 'Select a test first'}
                    />
                  )}
                  {row.test && <p className={hintCls}>{languageTestScoreHint(row.test)}</p>}
                </div>
              </div>
            </div>
          )
        })}
        <AddRowButton
          label="Add test score"
          onClick={() => onChange({ languageTests: [...values.languageTests, emptyLanguageTestDraft()] })}
        />
      </div>

      <div>
        <label className={labelCls}>
          Budget <FieldMark kind="optional" />
        </label>
        <input
          value={values.budget}
          onChange={(e) => onChange({ budget: e.target.value })}
          className={inputCls}
          placeholder="Approximate budget, e.g. PKR 30 lakh"
          maxLength={200}
        />
        <p className={hintCls}>Approximate budget for the visa, study, or travel process.</p>
      </div>
    </div>
  )
}
