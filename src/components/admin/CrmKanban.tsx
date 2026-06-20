'use client'

import { type DragEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  DEAL_SERVICE_LABELS,
  DEAL_SERVICE_TYPES,
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  formatPkr,
  type DealServiceType,
  type DealStage,
} from '@/lib/admin/dealTypes'
import { cn } from '@/lib/utils'

type CounselorOption = { id: string; name: string }
type ClientOption = { id: string; name: string }
type ProductOption = { id: string; name: string; base_price: number }

type Deal = {
  id: string
  client_id: string
  counselor_id: string | null
  service_type: string
  target_country: string | null
  deal_value: number
  currency: string
  stage: string
  stage_notes: string | null
  signed_at: string | null
  expected_close_date: string | null
  actual_close_date: string | null
  created_at: string
  client_name: string | null
  counselor_name: string | null
  product_id: string | null
  product_name: string | null
}

type DealForm = {
  client_id: string
  counselor_id: string
  service_type: DealServiceType
  target_country: string
  deal_value: string
  expected_close_date: string
  stage_notes: string
  product_id: string
}

const emptyForm: DealForm = {
  client_id: '',
  counselor_id: '',
  service_type: 'study_visa',
  target_country: '',
  deal_value: '',
  expected_close_date: '',
  stage_notes: '',
  product_id: '',
}

const inputClass =
  'min-h-[48px] w-full rounded-full px-4 py-2.5 text-sm outline-none glass-input'

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function CrmKanban({
  counselors,
  clients,
}: {
  counselors: CounselorOption[]
  clients: ClientOption[]
}) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [counselorFilter, setCounselorFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<DealForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  const loadDeals = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (counselorFilter) params.set('counselor_id', counselorFilter)
      if (serviceFilter) params.set('service_type', serviceFilter)
      if (monthFilter) params.set('month', monthFilter)
      const qs = params.toString()
      const res = await fetch(`/api/admin/crm/deals${qs ? `?${qs}` : ''}`)
      const data = await res.json()
      if (res.ok) setDeals(data.deals ?? [])
    } finally {
      setLoading(false)
    }
  }, [counselorFilter, serviceFilter, monthFilter])

  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  // Load products when New Deal modal or detail panel opens
  useEffect(() => {
    if (!modalOpen && !selectedDeal) return
    if (products.length > 0) return // already loaded
    setProductsLoading(true)
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, selectedDeal])

  const dealsByStage = useMemo(() => {
    const map = Object.fromEntries(DEAL_STAGES.map((s) => [s, [] as Deal[]])) as Record<
      DealStage,
      Deal[]
    >
    for (const deal of deals) {
      const stage = deal.stage as DealStage
      if (map[stage]) map[stage].push(deal)
    }
    return map
  }, [deals])

  async function updateDealStage(dealId: string, stage: DealStage) {
    const res = await fetch(`/api/admin/crm/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    const data = await res.json()
    if (res.ok) {
      setDeals((current) => current.map((d) => (d.id === dealId ? data.deal : d)))
      if (selectedDeal?.id === dealId) setSelectedDeal(data.deal)
    }
  }

  function handleDragStart(e: DragEvent, dealId: string) {
    setDraggingId(dealId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: DragEvent, stage: DealStage) {
    e.preventDefault()
    if (draggingId) {
      updateDealStage(draggingId, stage)
      setDraggingId(null)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/admin/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          counselor_id: form.counselor_id || null,
          product_id: form.product_id || null,
          deal_value: Number(form.deal_value) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create deal')
        return
      }
      setDeals((current) => [data.deal, ...current])
      setModalOpen(false)
      setForm(emptyForm)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handlePanelUpdate(updates: Partial<Deal>) {
    if (!selectedDeal) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/crm/deals/${selectedDeal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (res.ok) {
        setDeals((current) => current.map((d) => (d.id === selectedDeal.id ? data.deal : d)))
        setSelectedDeal(data.deal)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">CRM Pipeline</h1>
          <p className="mt-1 text-sm text-white/60">
            {deals.length} deal{deals.length === 1 ? '' : 's'} across pipeline
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm)
            setError('')
            setModalOpen(true)
          }}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-text"
        >
          <Plus className="h-4 w-4" />
          New Deal
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
        <select
          value={counselorFilter}
          onChange={(e) => setCounselorFilter(e.target.value)}
          className="min-h-[44px] w-full rounded-full px-4 text-sm outline-none glass-input sm:w-auto"
        >
          <option value="">All counselors</option>
          {counselors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="min-h-[44px] w-full rounded-full px-4 text-sm outline-none glass-input sm:w-auto"
        >
          <option value="">All services</option>
          {DEAL_SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {DEAL_SERVICE_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          placeholder={currentMonthValue()}
          className="min-h-[44px] w-full rounded-full px-4 text-sm outline-none glass-input sm:w-auto"
        />
        {(counselorFilter || serviceFilter || monthFilter) && (
          <button
            type="button"
            onClick={() => {
              setCounselorFilter('')
              setServiceFilter('')
              setMonthFilter('')
            }}
            className="text-sm text-white/50 hover:text-white"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-8 text-white/50">Loading deals…</p>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => {
            const columnDeals = dealsByStage[stage]
            const totalValue = columnDeals.reduce((sum, d) => sum + d.deal_value, 0)
            return (
              <div
                key={stage}
                className="flex w-72 shrink-0 flex-col rounded-2xl border border-white/10 glass-card"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="border-b border-white/10 p-4">
                  <h2 className="font-semibold text-white">{DEAL_STAGE_LABELS[stage]}</h2>
                  <p className="mt-1 text-xs text-white/50">
                    {columnDeals.length} deal{columnDeals.length === 1 ? '' : 's'} ·{' '}
                    {formatPkr(totalValue)}
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  {columnDeals.map((deal) => (
                    <button
                      key={deal.id}
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onClick={() => setSelectedDeal(deal)}
                      className={cn(
                        'rounded-2xl border border-white/10 glass-card-md p-4 text-left transition-opacity hover:brightness-125',
                        draggingId === deal.id && 'opacity-50'
                      )}
                    >
                      <p className="font-medium text-white">{deal.client_name ?? 'Unknown'}</p>
                      <p className="mt-1 text-xs text-white/50">
                        {deal.counselor_name ?? 'Unassigned'}
                      </p>
                      <p className="mt-2 text-xs text-white/60">
                        {DEAL_SERVICE_LABELS[deal.service_type as DealServiceType] ??
                          deal.service_type}
                        {deal.target_country ? ` · ${deal.target_country}` : ''}
                      </p>
                      {deal.product_name && (
                        <p className="mt-1 text-[11px] text-white/40 truncate">{deal.product_name}</p>
                      )}
                      <p className="mt-2 text-sm font-semibold text-green">
                        {formatPkr(deal.deal_value)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedDeal && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setSelectedDeal(null)}
          role="presentation"
        >
          <div
            className="flex h-full w-full max-w-md flex-col overflow-y-auto dark-modal p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedDeal.client_name}</h2>
                <p className="text-sm text-white/60">{formatPkr(selectedDeal.deal_value)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeal(null)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-white/70">Stage</label>
                <select
                  value={selectedDeal.stage}
                  onChange={(e) =>
                    handlePanelUpdate({ stage: e.target.value as DealStage })
                  }
                  disabled={saving}
                  className={inputClass}
                >
                  {DEAL_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {DEAL_STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Counselor</label>
                <p className="text-sm text-white/60">
                  {selectedDeal.counselor_name ?? 'Unassigned'}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Service</label>
                <p className="text-sm text-white/60">
                  {DEAL_SERVICE_LABELS[selectedDeal.service_type as DealServiceType] ??
                    selectedDeal.service_type}
                  {selectedDeal.target_country ? ` · ${selectedDeal.target_country}` : ''}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Product</label>
                <select
                  value={selectedDeal.product_id ?? ''}
                  onChange={(e) => handlePanelUpdate({ product_id: e.target.value || null } as Partial<Deal>)}
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">No product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {selectedDeal.expected_close_date && (
                <div>
                  <label className="mb-1.5 block text-sm text-white/70">Expected close</label>
                  <p className="text-sm text-white/60">
                    {new Date(selectedDeal.expected_close_date).toLocaleDateString('en-PK')}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Notes</label>
                <textarea
                  defaultValue={selectedDeal.stage_notes ?? ''}
                  onBlur={(e) => {
                    if (e.target.value !== (selectedDeal.stage_notes ?? '')) {
                      handlePanelUpdate({ stage_notes: e.target.value })
                    }
                  }}
                  rows={3}
                  className="w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none glass-input"
                />
              </div>
            </div>
          </div>
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
              <h2 className="text-lg font-bold text-white">New Deal</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-white/70">Client</label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                  className={inputClass}
                  required
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Counselor</label>
                <select
                  value={form.counselor_id}
                  onChange={(e) => setForm((f) => ({ ...f, counselor_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Unassigned</option>
                  {counselors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Service type</label>
                <select
                  value={form.service_type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      service_type: e.target.value as DealServiceType,
                    }))
                  }
                  className={inputClass}
                  required
                >
                  {DEAL_SERVICE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {DEAL_SERVICE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Target country</label>
                <input
                  value={form.target_country}
                  onChange={(e) => setForm((f) => ({ ...f, target_country: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Deal value (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={form.deal_value}
                  onChange={(e) => setForm((f) => ({ ...f, deal_value: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Expected close date</label>
                <input
                  type="date"
                  value={form.expected_close_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expected_close_date: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">
                  Product
                  <span className="ml-1.5 text-xs text-white/35">(optional — auto-fills deal value)</span>
                </label>
                <select
                  value={form.product_id}
                  onChange={(e) => {
                    const pid = e.target.value
                    const prod = products.find((p) => p.id === pid)
                    setForm((f) => ({
                      ...f,
                      product_id: pid,
                      deal_value: prod ? String(prod.base_price) : f.deal_value,
                    }))
                  }}
                  className={inputClass}
                  disabled={productsLoading}
                >
                  <option value="">{productsLoading ? 'Loading…' : 'No product'}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-orange">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create Deal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
