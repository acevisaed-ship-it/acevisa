'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileSpreadsheet, Paperclip, Plus, Trash2, X } from 'lucide-react'
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

type LineItem = { description: string; amount: string }

type Invoice = {
  id: string
  invoice_number: string
  client_id: string
  deal_id: string | null
  counselor_id: string | null
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
  description: string
  amount: number
  currency: string
  paid_at: string
  notes: string | null
  created_at: string
}

const inputClass =
  'min-h-[48px] w-full rounded-full border border-text bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-blue'

function downloadExport(type: string) {
  const month = new Date().toISOString().slice(0, 7)
  const a = document.createElement('a')
  a.href = `/api/admin/finance/export?type=${type}&month=${month}`
  a.download = ''
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const STATUS_TABS = ['all', ...INVOICE_STATUSES] as const

function statusBadgeClass(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-green/20 text-text'
    case 'sent':
      return 'bg-blue/10 text-blue'
    case 'overdue':
      return 'bg-orange/20 text-orange'
    case 'cancelled':
      return 'bg-text/10 text-text/50'
    default:
      return 'bg-text/10 text-text/70'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Invoices tab
// ─────────────────────────────────────────────────────────────────────────────
function InvoicesTab({ clients, deals }: { clients: ClientOption[]; deals: DealOption[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [clientId, setClientId] = useState('')
  const [dealId, setDealId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', amount: '' }])

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

  const clientDeals = useMemo(() => deals.filter((d) => d.client_id === clientId), [deals, clientId])
  const subtotal = useMemo(() => lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0), [lineItems])
  const selectedClient = clients.find((c) => c.id === clientId)

  function openCreate() {
    setClientId(''); setDealId(''); setDueDate(''); setNotes('')
    setLineItems([{ description: '', amount: '' }]); setError('')
    setModalOpen(true)
  }

  async function handleCreate(e: FormEvent, sendNow: boolean) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          deal_id: dealId || null,
          counselor_id: selectedClient?.counselor_id || null,
          line_items: lineItems.map((i) => ({ description: i.description, amount: Number(i.amount) })),
          due_date: dueDate || null,
          notes: notes || null,
          status: sendNow ? 'sent' : 'draft',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create invoice'); return }
      setInvoices((cur) => [data.invoice, ...cur])
      setModalOpen(false)
    } catch { setError('Something went wrong') }
    finally { setSaving(false) }
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
          <span className="rounded-full bg-green/15 px-3 py-1 text-xs font-bold text-[#0A3F3A]">
            ↑ INCOMING CASH
          </span>
          <p className="text-sm text-text/60">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadExport('invoices')}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-text/20 bg-white px-4 py-2 text-sm font-medium text-text/70 hover:border-blue hover:text-blue transition-colors"
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
              statusTab === tab ? 'bg-green text-text' : 'bg-white text-text/70 hover:bg-text/5')}>
            {tab === 'all' ? 'All' : INVOICE_STATUS_LABELS[tab as InvoiceStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-text/60">Loading invoices…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-text/60">No invoices found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-text/10 bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-text/10 text-text/60">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Counselor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Due date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id} className="border-b border-text/5 last:border-0">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0A3F3A]">
                      ↑ IN
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 text-text">{invoice.client_name ?? '—'}</td>
                  <td className="px-4 py-3 text-text/70">{invoice.counselor_name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-green">{formatPkr(invoice.total)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusBadgeClass(invoice.status))}>
                      {INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus] ?? invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text/70">
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-PK') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => downloadInvoicePdf(invoice)}
                        className="inline-flex items-center gap-1 rounded-full bg-blue/10 px-3 py-1 text-xs font-medium text-blue">
                        <Download className="h-3 w-3" />Download
                      </button>
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <button type="button"
                          onClick={() => { setPaymentMethod('bank_transfer'); setReferenceNumber(''); setPaidAt(new Date().toISOString().slice(0, 10)); setError(''); setPaymentModal(invoice) }}
                          className="rounded-full bg-green/20 px-3 py-1 text-xs font-medium text-text">
                          Mark Paid
                        </button>
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
          onClick={() => setModalOpen(false)} role="presentation">
          <div className="flex h-full w-full flex-col overflow-y-auto bg-bg p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-blue">New Client Invoice</h2>
                <p className="text-xs text-green font-medium mt-0.5">↑ Incoming cash from client</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-text">Client</label>
                <select value={clientId} onChange={(e) => { setClientId(e.target.value); setDealId('') }} className={inputClass} required>
                  <option value="">Select client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {clientId && clientDeals.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm text-text">Link to deal (optional)</label>
                  <select value={dealId} onChange={(e) => setDealId(e.target.value)} className={inputClass}>
                    <option value="">No deal</option>
                    {clientDeals.map((d) => <option key={d.id} value={d.id}>{d.service_type} — {formatPkr(d.deal_value)}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm text-text">Line items</label>
                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input value={item.description}
                        onChange={(e) => { const n = [...lineItems]; n[idx] = { ...n[idx], description: e.target.value }; setLineItems(n) }}
                        placeholder="Description"
                        className="min-h-[44px] flex-1 rounded-full border border-text bg-bg px-4 text-sm outline-none focus:border-blue" />
                      <input type="number" min="0" value={item.amount}
                        onChange={(e) => { const n = [...lineItems]; n[idx] = { ...n[idx], amount: e.target.value }; setLineItems(n) }}
                        placeholder="Amount"
                        className="min-h-[44px] w-28 rounded-full border border-text bg-bg px-4 text-sm outline-none focus:border-blue" />
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
                  className="mt-2 text-sm text-blue hover:underline">
                  + Add line item
                </button>
              </div>

              <div className="rounded-2xl border border-text/10 bg-white p-4">
                <p className="text-sm text-text/60">Subtotal</p>
                <p className="text-lg font-semibold text-green">{formatPkr(subtotal)}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Due date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full resize-none rounded-2xl border border-text bg-bg px-4 py-2.5 text-sm outline-none focus:border-blue" />
              </div>

              {error && <p className="text-sm text-orange">{error}</p>}

              <div className="flex gap-3">
                <button type="button" disabled={saving} onClick={(e) => handleCreate(e, false)}
                  className="min-h-[52px] flex-1 rounded-full border border-text/20 bg-white py-3 text-sm font-bold text-text disabled:opacity-50">
                  Save Draft
                </button>
                <button type="button" disabled={saving} onClick={(e) => handleCreate(e, true)}
                  className="min-h-[52px] flex-1 rounded-full bg-green py-3 text-sm font-bold text-text disabled:opacity-50">
                  {saving ? 'Saving…' : 'Send to Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark paid modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setPaymentModal(null)} role="presentation">
          <div className="flex w-full flex-col bg-bg p-6 sm:max-w-md sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-blue">Record Payment</h2>
                <p className="text-sm text-text/60">{paymentModal.invoice_number}</p>
              </div>
              <button type="button" onClick={() => setPaymentModal(null)} className="flex min-h-[44px] min-w-[44px] items-center justify-center" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleMarkPaid} className="space-y-4">
              <p className="text-sm text-text">Amount: <strong className="text-green">{formatPkr(paymentModal.total)}</strong></p>
              <div>
                <label className="mb-1.5 block text-sm text-text">Payment method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className={inputClass}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text">Reference number</label>
                <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text">Date paid</label>
                <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text">Receipt (optional)</label>
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
                      ? 'border-blue bg-blue/5 text-blue'
                      : 'border-text/20 text-text/60 hover:border-text/40'
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
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Expenses tab
// ─────────────────────────────────────────────────────────────────────────────
function ExpensesTab() {
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
    setCategory('other'); setDescription(''); setAmount(''); setPaidAt(new Date().toISOString().slice(0, 10))
    setNotes(''); setReceiptFile(null); setError(''); setModalOpen(true)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      let receipt_url: string | null = null
      if (receiptFile) {
        receipt_url = await uploadReceipt(receiptFile)
        if (!receipt_url) { setError('Receipt upload failed — please try again'); setSaving(false); return }
      }
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, description, amount: Number(amount), paid_at: paidAt, notes, receipt_url }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to record expense'); return }
      setExpenses((cur) => [data.expense, ...cur])
      setModalOpen(false)
    } catch { setError('Something went wrong') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense record?')) return
    setDeleting(id)
    await fetch(`/api/admin/expenses?id=${id}`, { method: 'DELETE' })
    setExpenses((cur) => cur.filter((e) => e.id !== id))
    setDeleting(null)
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
          <p className="text-sm text-text/60">{filtered.length} record{filtered.length !== 1 ? 's' : ''} · {formatPkr(totalAmount)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadExport('expenses')}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-text/20 bg-white px-4 py-2 text-sm font-medium text-text/70 hover:border-orange hover:text-orange transition-colors"
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
              categoryFilter === tab ? 'bg-orange text-white' : 'bg-white text-text/70 hover:bg-text/5')}>
            {tab === 'all' ? 'All categories' : EXPENSE_CATEGORY_LABELS[tab as ExpenseCategory]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-text/60">Loading expenses…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-text/60">No expenses recorded.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-text/10 bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-text/10 text-text/60">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Receipt</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp) => (
                <tr key={exp.id} className="border-b border-text/5 last:border-0">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-orange/15 px-2.5 py-0.5 text-[11px] font-bold text-orange">
                      ↓ OUT
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text/70">
                    {new Date(exp.paid_at).toLocaleDateString('en-PK')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-text/10 px-2.5 py-0.5 text-xs font-medium text-text/70">
                      {EXPENSE_CATEGORY_LABELS[exp.category as ExpenseCategory] ?? exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text">{exp.description}</td>
                  <td className="px-4 py-3 font-semibold text-orange">{formatPkr(Number(exp.amount))}</td>
                  <td className="px-4 py-3 text-text/60 text-xs max-w-[160px] truncate">{exp.notes ?? '—'}</td>
                  <td className="px-4 py-3">
                    {(exp as Expense & { receipt_url?: string }).receipt_url ? (
                      <a
                        href={(exp as Expense & { receipt_url?: string }).receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue hover:underline"
                      >
                        <Paperclip className="h-3 w-3" /> Receipt
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleDelete(exp.id)} disabled={deleting === exp.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-orange/60 hover:bg-orange/10 hover:text-orange disabled:opacity-40"
                      aria-label="Delete expense">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create expense modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setModalOpen(false)} role="presentation">
          <div className="flex h-full w-full flex-col overflow-y-auto bg-bg p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-orange">Record Expense</h2>
                <p className="text-xs text-orange/70 font-medium mt-0.5">↓ Outgoing cost / payment</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-text">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={inputClass}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Office rent June 2026" className={inputClass} required />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Amount (PKR)</label>
                <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0" className={inputClass} required />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Date paid</label>
                <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputClass} required />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full resize-none rounded-2xl border border-text bg-bg px-4 py-2.5 text-sm outline-none focus:border-blue" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Receipt (optional)</label>
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
                    receiptFile
                      ? 'border-blue bg-blue/5 text-blue'
                      : 'border-text/20 text-text/60 hover:border-text/40'
                  )}
                >
                  <Paperclip className="h-4 w-4 shrink-0" />
                  {receiptFile ? receiptFile.name : 'Attach receipt (image or PDF)'}
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
                {saving ? 'Saving…' : 'Record Expense'}
              </button>
            </form>
          </div>
        </div>
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
}: {
  clients: ClientOption[]
  deals: DealOption[]
}) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices')

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-blue md:text-3xl">Invoices &amp; Expenses</h1>
        <p className="mt-1 text-sm text-text/60">
          Client invoices (incoming cash) and business expenses (outgoing costs) tracked separately.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-2 rounded-2xl border border-text/10 bg-white p-1.5 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors',
            activeTab === 'invoices'
              ? 'bg-green text-[#0A3F3A] shadow-sm'
              : 'text-text/60 hover:text-text'
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
              : 'text-text/60 hover:text-text'
          )}
        >
          <span>↓</span> Expenses
        </button>
      </div>

      {activeTab === 'invoices' ? (
        <InvoicesTab clients={clients} deals={deals} />
      ) : (
        <ExpensesTab />
      )}
    </>
  )
}
