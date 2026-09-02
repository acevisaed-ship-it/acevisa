'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ClassAttendanceIcon } from '@/components/receptionist/icons'

type SearchResult = { id: string; name: string; clientCode: string; counselorName: string }
type Enrollment = { enrollmentId: string; classId: string; className: string; subject: string | null; markedToday: boolean }
type ClassOption = { id: string; name: string; subject: string | null }

export function ReceptionistClassAttendance() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)

  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const [allClasses, setAllClasses] = useState<ClassOption[]>([])
  const [pickClassId, setPickClassId] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/receptionist/classes')
      .then((r) => r.json())
      .then((d) => setAllClasses(d.classes ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/receptionist/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  async function loadEnrollments(clientId: string) {
    setLoadingEnrollments(true)
    try {
      const res = await fetch(`/api/receptionist/clients/${clientId}/classes`)
      const data = await res.json()
      setEnrollments(res.ok ? data.enrollments ?? [] : [])
    } finally {
      setLoadingEnrollments(false)
    }
  }

  function selectClient(r: SearchResult) {
    setSelected(r)
    setResults([])
    setQuery('')
    setMessage(null)
    setPickClassId('')
    loadEnrollments(r.id)
  }

  async function handleEnroll() {
    if (!selected || !pickClassId) return
    setEnrolling(true)
    setMessage(null)
    try {
      const res = await fetch('/api/receptionist/class-enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selected.id, classId: pickClassId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to enroll' })
        return
      }
      setPickClassId('')
      await loadEnrollments(selected.id)
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again' })
    } finally {
      setEnrolling(false)
    }
  }

  async function markPresent(enrollment: Enrollment) {
    setMarkingId(enrollment.enrollmentId)
    setMessage(null)
    try {
      const res = await fetch('/api/receptionist/class-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: enrollment.enrollmentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to mark attendance' })
        return
      }
      setMessage({ type: 'success', text: `${selected?.name} marked present for ${enrollment.className}` })
      setEnrollments((prev) =>
        prev.map((e) => (e.enrollmentId === enrollment.enrollmentId ? { ...e, markedToday: true } : e))
      )
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again' })
    } finally {
      setMarkingId(null)
    }
  }

  const enrollableClasses = allClasses.filter((c) => !enrollments.some((e) => e.classId === c.id))

  return (
    <Card variant="green" className="p-5">
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg shadow-sm shadow-black/10 text-blue">
          <ClassAttendanceIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-grad-teal">Record class attendance</p>
          <p className="mt-0.5 text-xs text-blue">
            For students enrolled in IELTS or other language classes — mark them present, or enroll
            them here first.
          </p>
        </div>
      </div>

      {!selected ? (
        <div className="relative mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or AV-code"
            className="min-h-[44px] w-full rounded-xl px-3 py-2 text-sm outline-none glass-input-dark"
          />
          {searching && <p className="mt-1 text-xs text-blue/80">Searching…</p>}
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-text/10 rounded-xl border border-text/15">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => selectClient(r)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-text/5"
                  >
                    <span>
                      <span className="font-semibold text-text">{r.name}</span>{' '}
                      <span className="text-blue">· {r.clientCode}</span>
                    </span>
                    <span className="text-xs text-blue">{r.counselorName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-text/15 px-3 py-2">
            <span className="text-sm">
              <span className="font-semibold text-text">{selected.name}</span>{' '}
              <span className="text-blue">· {selected.clientCode}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setSelected(null)
                setEnrollments([])
              }}
              className="text-xs text-blue hover:text-text"
            >
              Change
            </button>
          </div>

          {loadingEnrollments ? (
            <p className="text-xs text-blue/80">Loading classes…</p>
          ) : enrollments.length === 0 ? (
            <p className="text-xs text-blue">Not enrolled in any class yet — enroll them below.</p>
          ) : (
            <ul className="space-y-2">
              {enrollments.map((e) => (
                <li
                  key={e.enrollmentId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-text/15 px-3 py-2"
                >
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-text">{e.className}</span>
                    {e.subject && <span className="text-blue"> · {e.subject}</span>}
                  </span>
                  <Button
                    type="button"
                    disabled={e.markedToday || markingId === e.enrollmentId}
                    onClick={() => markPresent(e)}
                    className="min-h-[36px] px-4 py-1.5 text-xs"
                  >
                    {e.markedToday ? '✓ Present today' : markingId === e.enrollmentId ? 'Marking…' : 'Mark present'}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {enrollableClasses.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-text/15 pt-3">
              <select
                value={pickClassId}
                onChange={(e) => setPickClassId(e.target.value)}
                className="min-h-[40px] flex-1 rounded-xl px-3 py-2 text-sm outline-none glass-input-dark"
              >
                <option value="">Enroll in another class…</option>
                {enrollableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.subject ? ` (${c.subject})` : ''}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={!pickClassId || enrolling}
                onClick={handleEnroll}
                variant="secondary"
                className="border border-text/25 text-text hover:bg-text/5"
              >
                {enrolling ? 'Enrolling…' : 'Enroll'}
              </Button>
            </div>
          )}
        </div>
      )}

      {message && (
        <p className={`mt-3 text-sm font-medium ${message.type === 'error' ? 'text-red-700' : 'text-text'}`}>
          {message.type === 'success' ? '✓ ' : ''}
          {message.text}
        </p>
      )}
    </Card>
  )
}
