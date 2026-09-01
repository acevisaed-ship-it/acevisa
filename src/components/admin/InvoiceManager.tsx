'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileSpreadsheet, Paperclip, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  formatPkr,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type ExpenseCategory,
  type InvoiceStatus,
  type PaymentMethod,
} from '@/lib/admin/dealTypes'
import { downloadInvoicePdf } from '@/lib/admin/generateInvoicePdf'
import { createClient } from '@/lib/supabase/client'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import { cn } from '@/lib/utils'

async function uploadReceipt(file: File): Promise<string | null> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('receipts').upload(path, file)
  if (error) { console.error('Receipt upload error:', error); return null }
  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}

type ClientOption = { id: string; name: string; counselor_id: string | null }
type DealOption = { id: string; client_id: string; deal_value: number; service_type: string }

type ProductStage = {
  stage_order: number
  stage_name: string
  amount_type: 'fixed' | 'percentage'
  amount: number
  percentage: number
}

type ProductVendor = {
  id?: string
  vendor_name: string
  vendor_type: string
  amount_type: 'fixed' | 'percentage'
  amount: number
  percentage: number
  currency: string
}

type ProductCommission = {
  id?: string
  counselor_id: string | null
  role: string
  commission_type: 'percentage' | 'fixed'
  commission_value: number
  applies_to_stage: number | null
  notes: string | null
}

type ProductOption = {
  id: string
  name: string
  category: string
  base_price: number
  product_payment_stages: ProductStage[]
  product_vendors: ProductVendor[]
  product_commission_rules: ProductCommission[]
}

type LineItem = { description: string; amount: string }

type Invoice = {
  id: string
  invoice_number: string
  client_id: string
  deal_id: string | null
  counselor_id: string | null
  product_id: string | null
  product_name: string | null
  line_items: { description: string; amount: number }[]
  subtotal: number
  total: number
  status: string
  due_date: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  client_name: string | null
  counselor_name: string | null
}

type Expense = {
  id: string
  category: string
  subcategory?: string | null
  description: string
  amount: number
  currency: string
  paid_at: string
  notes: string | null
  receipt_url?: string | null
  created_at: string
}

const inputClass = 'min-h-[48px] w-full rounded-full px-4 py-2.5 text-sm outline-none glass-input'

function downloadExport(type: string) {
  const month = new Date().toISOString().slice(0, 7)
  const a = document.createElement('a')
  a.href = `/api/admin/finance/export?type=${type}&month=${month}`
  a.download = ''
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Searchable client picker — type to filter by name instead of scrolling a
// long plain <select>. Used wherever an invoice needs a client attached.
function ClientSearchSelect({
  clients,
  value,
  onChange,
}: {
  clients: ClientOption[]
  value: string
  onChange: (clientId: string) => void
}) {
  const [query, setQuery] = useState(() => clients.find((c) => c.id === value)?.name ?? '')
  const [open, setOpen] = useState(false)

  // Keep the input text in sync if `value` is reset from outside (e.g. modal close/reopen).
  useEffect(() => {
    setQuery(clients.find((c) => c.id === value)?.name ?? '')
  }, [value, clients])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => c.name.toLowerCase().includes(q))
  }, [clients, query])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange('')
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search client by name…"
          className={cn(inputClass, 'pl-10')}
          autoComplete="off"
          required
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-white/10 dark-modal py-1 shadow-xl">
          {matches.length === 0 ? (
            <p className="px-4 py-2.5 text-sm text-white/40">No clients match &ldquo;{query}&rdquo;</p>
          ) : (
            matches.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c.id)
                  setQuery(c.name)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors',
                  c.id === value ? 'bg-green/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const STATUS_TABS = ['all', ...INVOICE_STATUSES] as const

function statusBadgeClass(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-green/20 text-white'
    case 'sent':
      return 'bg-blue/20 text-white'
    case 'overdue':
      return 'bg-orange/20 text-orange'
    case 'cancelled':
      return 'glass-card text-white/40'
    default:
      return 'glass-card text-white/50'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Invoices tab
// ─────────────────────────────────────────────────────────────────────────────
function InvoicesTab({
  clients,
  deals,
  canManageEntries,
}: {
  clients: ClientOption[]
  deals: DealOption[]
  canManageEntries: boolean
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [clientId, setClientId] = useState('')
  const [dealId, setDealId] = useState('')
  const [productId, setProductId] = useState('')
  const [products, setProducts] = useState<ProductOption[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', amount: '' }])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('draft')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null)
  const paymentReceiptRef = useRef<HTMLInputElement>(null)

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const qs = statusTab !== 'all' ? `?status=${statusTab}` : ''
      const res = await fetch(`/api/admin/invoices${qs}`)
      const data = await res.json()
      if (res.ok) setInvoices(data.invoices ?? [])
    } finally {
      setLoading(false)
    }
  }, [statusTab])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  // Load products when modal opens
  useEffect(() => {
    if (!modalOpen) return
    setProductsLoading(true)
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false))
  }, [modalOpen])

  // Derive selected product
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [productId, products]
  )

  function applyProductLineItems(nextProductId: string) {
    setProductId(nextProductId)
    const product = products.find((p) => p.id === nextProductId)
    if (!product) return
    const stages = product.product_payment_stages
    if (stages.length === 0) return
    setLineItems(
      stages.map((s) => ({
        description: s.stage_name,
        amount:
          s.amount_type === 'fixed'
            ? String(s.amount)
            : String(Math.round((product.base_price * Number(s.percentage)) / 100)),
      }))
    )
  }

  const clientDeals = useMemo(() => deals.filter((d) => d.client_id === clientId), [deals, clientId])
  const subtotal = useMemo(() => lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0), [lineItems])
  const selectedClient = clients.find((c) => c.id === clientId)

  function openCreate() {
    setEditingId(null)
    setInvoiceStatus('draft')
    setClientId(''); setDealId(''); setProductId(''); setDueDate(''); setNotes('')
    setLineItems([{ description: '', amount: '' }]); setError('')
    setModalOpen(true)
  }

  function openEdit(invoice: Invoice) {
    setEditingId(invoice.id)
    setClientId(invoice.client_id)
    setDealId(invoice.deal_id ?? '')
    setProductId(invoice.product_id ?? '')
    setDueDate(invoice.due_date ?? '')
    setNotes(invoice.notes ?? '')
    setInvoiceStatus(
      INVOICE_STATUSES.includes(invoice.status as InvoiceStatus)
        ? (invoice.status as InvoiceStatus)
        : 'sent'
    )
    setLineItems(
      invoice.line_items.length > 0
        ? invoice.line_items.map((item) => ({ description: item.description, amount: String(item.amount) }))
        : [{ description: '', amount: '' }]
    )
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
  }

  async function handleSave(e: FormEvent, sendNow: boolean) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = {
        client_id: clientId,
        deal_id: dealId || null,
        counselor_id: selectedClient?.counselor_id || null,
        product_id: productId || null,
        line_items: lineItems.map((i) => ({ description: i.description, amount: Number(i.amount) })),
        due_date: dueDate || null,
        notes: notes || null,
        status: editingId ? invoiceStatus : sendNow ? 'sent' : 'draft',
      }
      const res = await fetch(editingId ? `/api/admin/invoices/${editingId}` : '/api/admin/invoices', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || (editingId ? 'Failed to update invoice' : 'Failed to create invoice')); return }
      if (editingId) {
        setInvoices((cur) => cur.map((i) => (i.id === editingId ? data.invoice : i)))
      } else {
        setInvoices((cur) => [data.invoice, ...cur])
      }
      closeModal()
    } catch { setError('Something went wrong') }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/invoices/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to delete invoice'); return }
      setInvoices((cur) => cur.filter((i) => i.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch { setError('Something went wrong') }
    finally { setDeleting(false) }
  }

  async function handleMarkPaid(e: FormEvent) {
    e.preventDefault()
    if (!paymentModal) return
    setSaving(true); setError('')
    try {
      let receipt_url: string | null = null
      if (paymentReceiptFile) {
        receipt_url = await uploadReceipt(paymentReceiptFile)
        if (!receipt_url) { setError('Receipt upload failed'); setSaving(false); return }
      }
      const res = await fetch(`/api/admin/invoices/${paymentModal.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: paymentMethod, reference_number: referenceNumber, paid_at: paidAt, receipt_url }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to record payment'); return }
      setInvoices((cur) => cur.map((i) => (i.id === paymentModal.id ? data.invoice : i)))
      setPaymentModal(null)
    } catch { setError('Something went wrong') }
    finally { setSaving(false) }
  }

  const filtered = statusTab === 'all' ? invoices : invoices.filter((i) => i.status === statusTab)

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-green/20 px-3 py-1 text-xs font-bold text-white">
            ↑ INCOMING CASH
          </span>
          <p className="text-sm text-white/50">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadExport('invoices')}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 glass-card px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-text"
          >
            <Plus className="h-4 w-4" />
            New Client Invoice
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button key={tab} type="button" onClick={() => setStatusTab(tab)}
            className={cn('min-h-[40px] rounded-full px-4 text-sm font-medium transition-colors',
              statusTab === tab ? 'bg-green text-[#0A3F3A]' : 'glass-card text-white/50 hover:text-white')}>
            {tab === 'all' ? 'All' : INVOICE_STATUS_LABELS[tab as InvoiceStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-white/50">Loading invoices…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-white/50">No invoices found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 glass-card crisp-on-dark">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Counselor</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Due date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green/20 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      ↑ IN
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/70">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 text-white/80">{invoice.client_name ?? '—'}</td>
                  <td className="px-4 py-3 text-white/60">{invoice.counselor_name ?? '—'}</td>
                  <td className="px-4 py-3 text-white/60 max-w-[160px] truncate">
                    {invoice.product_name ?? <span className="text-white/25">—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-green">{formatPkr(invoice.total)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusBadgeClass(invoice.status))}>
                      {INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus] ?? invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-PK') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => downloadInvoicePdf(invoice)}
                        className="inline-flex items-center gap-1 rounded-full bg-blue/20 px-3 py-1 text-xs font-medium text-white">
                        <Download className="h-3 w-3" />Download
                      </button>
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <button type="button"
                          onClick={() => { setPaymentMethod('bank_transfer'); setReferenceNumber(''); setPaidAt(new Date().toISOString().slice(0, 10)); setError(''); setPaymentModal(invoice) }}
                          className="rounded-full bg-green/20 px-3 py-1 text-xs font-medium text-white">
                          Mark Paid
                        </button>
                      )}
                      {canManageEntries && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(invoice)}
                            className="inline-flex items-center gap-1 rounded-full bg-blue/20 px-3 py-1 text-xs font-medium text-white"
                          >
                            <Pencil className="h-3 w-3" />Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: invoice.id, label: invoice.invoice_number })}
                            className="inline-flex items-center gap-1 rounded-full bg-orange/20 px-3 py-1 text-xs font-medium text-orange"
                          >
                            <Trash2 className="h-3 w-3" />Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create invoice modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={closeModal} role="presentation">
          <div className="flex h-full w-full flex-col overflow-y-auto dark-modal p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingId ? 'Edit Invoice' : 'New Client Invoice'}
                </h2>
                <p className="text-xs text-green font-medium mt-0.5">
                  {editingId ? '↑ Update an existing incoming invoice' : '↑ Incoming cash from client'}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white/60 hover:text-white" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-white/70">Client</label>
                <ClientSearchSelect
                  clients={clients}
                  value={clientId}
                  onChange={(id) => { setClientId(id); setDealId('') }}
                />
              </div>

              {clientId && clientDeals.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm text-white/70">Link to deal (optional)</label>
                  <select value={dealId} onChange={(e) => setDealId(e.target.value)} className={inputClass}>
                    <option value="">No deal</option>
                    {clientDeals.map((d) => <option key={d.id} value={d.id}>{d.service_type} — {formatPkr(d.deal_value)}</option>)}
                  </select>
                </div>
              )}

              {/* ── Product selector ── */}
              <div>
                <label className="mb-1.5 block text-sm text-white/70">
                  Product
                  <span className="ml-1.5 text-xs text-white/35">(auto-fills line items, expenses &amp; commissions)</span>
                </label>
                <select
                  value={productId}
                  onChange={(e) => applyProductLineItems(e.target.value)}
                  className={inputClass}
                  disabled={productsLoading}
                >
                  <option value="">
                    {productsLoading ? 'Loading products…' : 'No product / custom invoice'}
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* ── Product breakdown preview ── */}
              {selectedProduct && (
                <div className="rounded-2xl border border-white/10 glass-card overflow-hidden divide-y divide-white/5">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03]">
                    <p className="text-xs font-bold text-white/60 uppercase tracking-wide">
                      {selectedProduct.name}
                    </p>
                    <p className="text-xs text-white/40">Base: {formatPkr(selectedProduct.base_price)}</p>
                  </div>

                  {/* Vendor costs */}
                  {selectedProduct.product_vendors.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-orange/70">
                        ↓ Vendor Costs (auto-saved as expenses)
                      </p>
                      <div className="space-y-1">
                        {selectedProduct.product_vendors.map((v, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-white/60">{v.vendor_name}</span>
                            <span className={cn('font-semibold', v.amount > 0 || v.percentage > 0 ? 'text-orange' : 'text-white/25')}>
                              {v.amount_type === 'fixed'
                                ? v.amount > 0 ? formatPkr(v.amount) : 'Not set'
                                : v.percentage > 0 ? `${v.percentage}% of total` : 'Not set'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commission recipients */}
                  {selectedProduct.product_commission_rules.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#B7C733]/70">
                        ↑ Commission Recipients
                      </p>
                      <div className="space-y-1">
                        {selectedProduct.product_commission_rules.map((r, i) => {
                          const stageLabel = r.applies_to_stage ? `Stage ${r.applies_to_stage}` : 'All'
                          const roleLabel = r.role.charAt(0).toUpperCase() + r.role.slice(1)
                          return (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-white/60">
                                {roleLabel}
                                <span className="ml-1 text-white/30">({stageLabel})</span>
                              </span>
                              <span className={cn('font-semibold', r.commission_value > 0 ? 'text-[#B7C733]' : 'text-white/25')}>
                                {r.commission_value > 0
                                  ? r.commission_type === 'fixed'
                                    ? formatPkr(r.commission_value)
                                    : `${r.commission_value}%`
                                  : 'Not set'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Line items</label>
                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input value={item.description}
                        onChange={(e) => { const n = [...lineItems]; n[idx] = { ...n[idx], description: e.target.value }; setLineItems(n) }}
                        placeholder="Description"
                        className="min-h-[44px] flex-1 rounded-full px-4 text-sm outline-none glass-input" />
                      <input type="number" min="0" value={item.amount}
                        onChange={(e) => { const n = [...lineItems]; n[idx] = { ...n[idx], amount: e.target.value }; setLineItems(n) }}
                        placeholder="Amount"
                        className="min-h-[44px] w-28 rounded-full px-4 text-sm outline-none glass-input" />
                      {lineItems.length > 1 && (
                        <button type="button" onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-orange">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setLineItems([...lineItems, { description: '', amount: '' }])}
                  className="mt-2 text-sm text-white/50 hover:text-white hover:underline">
                  + Add line item
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 glass-card p-4">
                <p className="text-sm text-white/50">Subtotal</p>
                <p className="text-lg font-semibold text-green">{formatPkr(subtotal)}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Due date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none glass-input" />
              </div>

              {editingId && (
                <div>
                  <label className="mb-1.5 block text-sm text-white/70">Status</label>
                  <select
                    value={invoiceStatus}
                    onChange={(e) => setInvoiceStatus(e.target.value as InvoiceStatus)}
                    className={inputClass}
                  >
                    {INVOICE_STATUSES.map((s) => (
                      <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && <p className="text-sm text-orange">{error}</p>}

              {editingId ? (
                <button type="button" disabled={saving} onClick={(e) => handleSave(e, false)}
                  className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              ) : (
                <div className="flex gap-3">
                  <button type="button" disabled={saving} onClick={(e) => handleSave(e, false)}
                    className="min-h-[52px] flex-1 rounded-full border border-white/20 glass-card py-3 text-sm font-bold text-white/70 disabled:opacity-50">
                    Save Draft
                  </button>
                  <button type="button" disabled={saving} onClick={(e) => handleSave(e, true)}
                    className="min-h-[52px] flex-1 rounded-full bg-green py-3 text-sm font-bold text-text disabled:opacity-50">
                    {saving ? 'Saving…' : 'Send to Client'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Mark paid modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setPaymentModal(null)} role="presentation">
          <div className="flex w-full flex-col dark-modal p-6 sm:max-w-md sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Record Payment</h2>
                <p className="text-sm text-white/60">{paymentModal.invoice_number}</p>
              </div>
              <button type="button" onClick={() => setPaymentModal(null)} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white/60 hover:text-white" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleMarkPaid} className="space-y-4">
              <p className="text-sm text-white/80">Amount: <strong className="text-green">{formatPkr(paymentModal.total)}</strong></p>
              <div>
                <label className="mb-1.5 block text-sm text-white/70">Payment method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className={inputClass}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/70">Reference number</label>
                <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/70">Date paid</label>
                <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/70">Receipt (optional)</label>
                <input
                  ref={paymentReceiptRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => paymentReceiptRef.current?.click()}
                  className={cn(
                    'flex min-h-[48px] w-full items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                    paymentReceiptFile
                      ? 'border-blue bg-blue/10 text-white'
                      : 'border-white/20 text-white/50 hover:text-white'
                  )}
                >
                  <Paperclip className="h-4 w-4 shrink-0" />
                  {paymentReceiptFile ? paymentReceiptFile.name : 'Attach receipt (image or PDF)'}
                  {paymentReceiptFile && (
                    <span
                      className="ml-auto text-text/40 hover:text-red-500"
                      onClick={(e) => { e.stopPropagation(); setPaymentReceiptFile(null); if (paymentReceiptRef.current) paymentReceiptRef.current.value = '' }}
                    >
                      ✕
                    </span>
                  )}
                </button>
              </div>
              {error && <p className="text-sm text-orange">{error}</p>}
              <button type="submit" disabled={saving}
                className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text disabled:opacity-50">
                {saving ? 'Recording…' : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Expenses tab
// ─────────────────────────────────────────────────────────────────────────────
function ExpensesTab({ canManageEntries }: { canManageEntries: boolean }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Form state
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const receiptInputRef = useRef<HTMLInputElement>(null)

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const qs = categoryFilter !== 'all' ? `?category=${categoryFilter}` : ''
      const res = await fetch(`/api/admin/expenses${qs}`)
      const data = await res.json()
      if (res.ok) setExpenses(data.expenses ?? [])
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  function openCreate() {
    setEditingId(null)
    setExistingReceiptUrl(null)
    setCategory('other'); setDescription(''); setAmount(''); setPaidAt(new Date().toISOString().slice(0, 10))
    setNotes(''); setReceiptFile(null); setError(''); setModalOpen(true)
  }

  function openEdit(exp: Expense) {
    setEditingId(exp.id)
    setExistingReceiptUrl(exp.receipt_url ?? null)
    setCategory(exp.category as ExpenseCategory)
    setDescription(exp.description)
    setAmount(String(exp.amount))
    setPaidAt(exp.paid_at.slice(0, 10))
    setNotes(exp.notes ?? '')
    setReceiptFile(null)
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setExistingReceiptUrl(null)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      let receipt_url: string | null | undefined = undefined
      if (receiptFile) {
        receipt_url = await uploadReceipt(receiptFile)
        if (!receipt_url) { setError('Receipt upload failed — please try again'); setSaving(false); return }
      } else if (!editingId) {
        receipt_url = null
      } else {
        receipt_url = existingReceiptUrl
      }
      const res = await fetch('/api/admin/expenses', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          category,
          description,
          amount: Number(amount),
          paid_at: paidAt,
          notes,
          receipt_url,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || (editingId ? 'Failed to update expense' : 'Failed to record expense')); return }
      if (editingId) {
        setExpenses((cur) => cur.map((exp) => (exp.id === editingId ? data.expense : exp)))
      } else {
        setExpenses((cur) => [data.expense, ...cur])
      }
      closeModal()
    } catch { setError('Something went wrong') }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    try {
      const res = await fetch(`/api/admin/expenses?id=${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete expense')
        return
      }
      setExpenses((cur) => cur.filter((e) => e.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch { setError('Something went wrong') }
    finally { setDeleting(null) }
  }

  const filtered = categoryFilter === 'all' ? expenses : expenses.filter((e) => e.category === categoryFilter)
  const totalAmount = filtered.reduce((s, e) => s + Number(e.amount), 0)

  const CATEGORY_TABS = ['all', ...EXPENSE_CATEGORIES] as const

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-orange/15 px-3 py-1 text-xs font-bold text-orange">
            ↓ OUTGOING EXPENSES
          </span>
          <p className="text-sm text-white/50">{filtered.length} record{filtered.length !== 1 ? 's' : ''} · {formatPkr(totalAmount)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadExport('expenses')}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/20 glass-card px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </button>
          <button type="button" onClick={openCreate}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-bold text-white">
            <Plus className="h-4 w-4" />
            Record Expense
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => (
          <button key={tab} type="button" onClick={() => setCategoryFilter(tab)}
            className={cn('min-h-[40px] rounded-full px-4 text-sm font-medium transition-colors',
              categoryFilter === tab ? 'bg-orange text-white' : 'glass-card text-white/50 hover:text-white')}>
            {tab === 'all' ? 'All categories' : EXPENSE_CATEGORY_LABELS[tab as ExpenseCategory]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-white/50">Loading expenses…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-white/50">No expenses recorded.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 glass-card crisp-on-dark">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Receipt</th>
                {canManageEntries && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp) => (
                <tr key={exp.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-orange/15 px-2.5 py-0.5 text-[11px] font-bold text-orange">
                      ↓ OUT
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {new Date(exp.paid_at).toLocaleDateString('en-PK')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full glass-card px-2.5 py-0.5 text-xs font-medium text-white/50">
                      {EXPENSE_CATEGORY_LABELS[exp.category as ExpenseCategory] ?? exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/80">{exp.description}</td>
                  <td className="px-4 py-3 font-semibold text-orange">{formatPkr(Number(exp.amount))}</td>
                  <td className="px-4 py-3 text-white/50 text-xs max-w-[160px] truncate">{exp.notes ?? '—'}</td>
                  <td className="px-4 py-3">
                    {exp.receipt_url ? (
                      <a
                        href={exp.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-white/60 hover:text-white hover:underline"
                      >
                        <Paperclip className="h-3 w-3" /> Receipt
                      </a>
                    ) : '—'}
                  </td>
                  {canManageEntries && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(exp)}
                        className="inline-flex items-center gap-1 rounded-full bg-blue/20 px-3 py-1 text-xs font-medium text-white"
                      >
                        <Pencil className="h-3 w-3" />Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: exp.id, label: exp.description })}
                        disabled={deleting === exp.id}
                        className="inline-flex items-center gap-1 rounded-full bg-orange/20 px-3 py-1 text-xs font-medium text-orange disabled:opacity-40"
                      >
                        <Trash2 className="h-3 w-3" />Delete
                      </button>
                    </div>
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create expense modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={closeModal} role="presentation">
          <div className="flex h-full w-full flex-col overflow-y-auto dark-modal p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-orange">
                  {editingId ? 'Edit Expense' : 'Record Expense'}
                </h2>
                <p className="text-xs text-orange/70 font-medium mt-0.5">
                  {editingId ? '↓ Update an existing outgoing cost' : '↓ Outgoing cost / payment'}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white/60 hover:text-white" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-white/70">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={inputClass}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Office rent June 2026" className={inputClass} required />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Amount (PKR)</label>
                <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0" className={inputClass} required />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Date paid</label>
                <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputClass} required />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none glass-input" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">Receipt (optional)</label>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  className={cn(
                    'flex min-h-[48px] w-full items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                    receiptFile || existingReceiptUrl
                      ? 'border-blue bg-blue/10 text-white'
                      : 'border-white/20 text-white/50 hover:text-white'
                  )}
                >
                  <Paperclip className="h-4 w-4 shrink-0" />
                  {receiptFile
                    ? receiptFile.name
                    : existingReceiptUrl
                      ? 'Keep existing receipt (or attach a replacement)'
                      : 'Attach receipt (image or PDF)'}
                  {receiptFile && (
                    <span
                      className="ml-auto text-text/40 hover:text-red-500"
                      onClick={(e) => { e.stopPropagation(); setReceiptFile(null); if (receiptInputRef.current) receiptInputRef.current.value = '' }}
                    >
                      ✕
                    </span>
                  )}
                </button>
              </div>

              {error && <p className="text-sm text-orange">{error}</p>}

              <button type="submit" disabled={saving}
                className="min-h-[52px] w-full rounded-full bg-orange py-3 text-sm font-bold text-white disabled:opacity-50">
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Record Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          loading={deleting === deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export — tabbed shell
// ─────────────────────────────────────────────────────────────────────────────
export function InvoiceManager({
  clients,
  deals,
  canManageEntries,
}: {
  clients: ClientOption[]
  deals: DealOption[]
  canManageEntries: boolean
}) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices')

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Invoices &amp; Expenses</h1>
        <p className="mt-1 text-sm text-white/60">
          Client invoices (incoming cash) and business expenses (outgoing costs) tracked separately.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-2 rounded-2xl tab-container p-1.5 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors',
            activeTab === 'invoices'
              ? 'bg-green text-[#0A3F3A] shadow-sm'
              : 'text-white/50 hover:text-white'
          )}
        >
          <span>↑</span> Client Invoices
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors',
            activeTab === 'expenses'
              ? 'bg-orange text-white shadow-sm'
              : 'text-white/50 hover:text-white'
          )}
        >
          <span>↓</span> Expenses
        </button>
      </div>

      {activeTab === 'invoices' ? (
        <InvoicesTab clients={clients} deals={deals} canManageEntries={canManageEntries} />
      ) : (
        <ExpensesTab canManageEntries={canManageEntries} />
      )}
    </>
  )
}
