'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { KB_CATEGORIES, type KbCategory } from '@/lib/admin/categories'
import { cn } from '@/lib/utils'

type KbEntry = {
  id: string
  category: string
  topic: string
  answer: string
  is_active: boolean
  added_at: string
}

type FormState = {
  category: KbCategory
  topic: string
  answer: string
  is_active: boolean
}

const emptyForm: FormState = {
  category: 'Study Visa',
  topic: '',
  answer: '',
  is_active: true,
}

const inputClass =
  'min-h-[48px] w-full rounded-full px-4 py-2.5 text-sm outline-none glass-input'

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function categoryColor(category: string) {
  switch (category) {
    case 'Study Visa':
      return 'bg-blue/20 text-white'
    case 'Work Abroad':
      return 'bg-green/20 text-white'
    case 'Visit & Immigration':
      return 'bg-orange/20 text-orange'
    case 'Language & IELTS':
      return 'glass-card text-white/70'
    default:
      return 'glass-card text-white/50'
  }
}

export function KnowledgeBaseManager() {
  const [entries, setEntries] = useState<KbEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KbEntry | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/knowledge-base')
      const data = await res.json()
      if (res.ok) setEntries(data.entries ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (!showInactive && !entry.is_active) return false
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false
      return true
    })
  }, [entries, categoryFilter, showInactive])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(entry: KbEntry) {
    setEditing(entry)
    setForm({
      category: entry.category as KbCategory,
      topic: entry.topic,
      answer: entry.answer,
      is_active: entry.is_active,
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!form.topic.trim() || !form.answer.trim()) {
      setError('Topic and answer are required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const url = editing
        ? `/api/admin/knowledge-base/${editing.id}`
        : '/api/admin/knowledge-base'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Save failed')
        return
      }

      if (editing) {
        setEntries((current) =>
          current.map((e) => (e.id === editing.id ? data.entry : e))
        )
      } else {
        setEntries((current) => [...current, data.entry])
      }
      setModalOpen(false)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(entry: KbEntry) {
    const res = await fetch(`/api/admin/knowledge-base/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !entry.is_active }),
    })
    const data = await res.json()
    if (res.ok) {
      setEntries((current) =>
        current.map((e) => (e.id === entry.id ? data.entry : e))
      )
    }
  }

  async function handleDelete(entry: KbEntry) {
    if (!confirm(`Deactivate "${entry.topic}"?`)) return
    const res = await fetch(`/api/admin/knowledge-base/${entry.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      setEntries((current) =>
        current.map((e) => (e.id === entry.id ? data.entry : e))
      )
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Knowledge Base</h1>
          <p className="mt-1 text-sm text-white/60">
            {entries.filter((e) => e.is_active).length} active entries for AI chat
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-text"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="min-h-[44px] rounded-full px-4 text-sm outline-none glass-input"
        >
          <option value="all">All categories</option>
          {KB_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-white/30"
          />
          Show inactive
        </label>
      </div>

      {loading ? (
        <p className="mt-8 text-white/50">Loading entries…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-white/50">No knowledge base entries yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 glass-card crisp-on-dark">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Topic</th>
                <th className="px-4 py-3 font-medium">Answer</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className={cn(
                    'border-b border-white/5 last:border-0',
                    !entry.is_active && 'opacity-50'
                  )}
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-block rounded-full px-2.5 py-1 text-xs font-medium',
                        categoryColor(entry.category)
                      )}
                    >
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-white/80">{entry.topic}</td>
                  <td className="max-w-xs px-4 py-3 text-white/60">
                    {truncate(entry.answer, 100)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(entry)}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        entry.is_active ? 'bg-green' : 'bg-text/20'
                      )}
                      aria-label={entry.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                          entry.is_active ? 'left-5' : 'left-0.5'
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(entry)}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white/60"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry)}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-orange"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            className="flex h-full w-full flex-col overflow-y-auto dark-modal p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-white">
                {editing ? 'Edit Entry' : 'Add Entry'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-white/70">Category</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as KbCategory }))
                  }
                  className={inputClass}
                >
                  {KB_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Topic</label>
                <input
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. UK blocked account requirement"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Answer</label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                  rows={5}
                  className="w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none glass-input"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4"
                />
                Active
              </label>

              {error && <p className="text-sm text-orange">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
