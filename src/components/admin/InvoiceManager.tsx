'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Plus, X } from 'lucide-react'
import {
  formatPkr,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type InvoiceStatus,
  type PaymentMethod,
} from '@/lib/admin/dealTypes'
import { downloadInvoicePdf } from '@/lib/admin/generateInvoicePdf'
import { cn } from '@/lib/utils'

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

const inputClass =
  'min-h-[48px] w-full rounded-full border border-text bg-bg px-4 py-2.5 text-sm text-text outline-none focus:border-blue'

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

export function InvoiceManager({
  clients,
  deals,
}: {
  clients: ClientOption[]
  deals: DealOption[]
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
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', amount: '' },
  ])

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))

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

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const clientDeals = useMemo(
    () => deals.filter((d) => d.client_id === clientId),
    [deals, clientId]
  )

  const subtotal = useMemo(
    () =>
      lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [lineItems]
  )

  const selectedClient = clients.find((c) => c.id === clientId)

  function openCreate() {
    setClientId('')
    setDealId('')
    setDueDate('')
    setNotes('')
    setLineItems([{ description: '', amount: '' }])
    setError('')
    setModalOpen(true)
  }

  async function handleCreate(e: FormEvent, sendNow: boolean) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          deal_id: dealId || null,
          counselor_id: selectedClient?.counselor_id || null,
          line_items: lineItems.map((i) => ({
            description: i.description,
            amount: Number(i.amount),
          })),
          due_date: dueDate || null,
          notes: notes || null,
          status: sendNow ? 'sent' : 'draft',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create invoice')
        return
      }
      setInvoices((current) => [data.invoice, ...current])
      setModalOpen(false)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkPaid(e: FormEvent) {
    e.preventDefault()
    if (!paymentModal) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/invoices/${paymentModal.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          paid_at: paidAt,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to record payment')
        return
      }
      setInvoices((current) =>
        current.map((i) => (i.id === paymentModal.id ? data.invoice : i))
      )
      setPaymentModal(null)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const filteredInvoices =
    statusTab === 'all'
      ? invoices
      : invoices.filter((i) => i.status === statusTab)

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue md:text-3xl">Invoices</h1>
          <p className="mt-1 text-sm text-text/60">
            {invoices.length} invoice{invoices.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-text"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusTab(tab)}
            className={cn(
              'min-h-[40px] rounded-full px-4 text-sm font-medium transition-colors',
              statusTab === tab
                ? 'bg-green text-text'
                : 'bg-white text-text/70 hover:bg-text/5'
            )}
          >
            {tab === 'all' ? 'All' : INVOICE_STATUS_LABELS[tab as InvoiceStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-text/60">Loading invoices…</p>
      ) : filteredInvoices.length === 0 ? (
        <p className="mt-8 text-text/60">No invoices found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-text/10 bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-text/10 text-text/60">
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
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-text/5 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-text">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-text">{invoice.client_name ?? '—'}</td>
                  <td className="px-4 py-3 text-text/70">
                    {invoice.counselor_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-text">
                    {formatPkr(invoice.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium',
                        statusBadgeClass(invoice.status)
                      )}
                    >
                      {INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus] ??
                        invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text/70">
                    {invoice.due_date
                      ? new Date(invoice.due_date).toLocaleDateString('en-PK')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadInvoicePdf(invoice)}
                        className="inline-flex items-center gap-1 rounded-full bg-blue/10 px-3 py-1 text-xs font-medium text-blue"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('bank_transfer')
                            setReferenceNumber('')
                            setPaidAt(new Date().toISOString().slice(0, 10))
                            setError('')
                            setPaymentModal(invoice)
                          }}
                          className="rounded-full bg-green/20 px-3 py-1 text-xs font-medium text-text"
                        >
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

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            className="flex h-full w-full flex-col overflow-y-auto bg-bg p-6 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-blue">New Invoice</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-text">Client</label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value)
                    setDealId('')
                  }}
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

              {clientId && clientDeals.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm text-text">Link to deal</label>
                  <select
                    value={dealId}
                    onChange={(e) => setDealId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">No deal</option>
                    {clientDeals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.service_type} — {formatPkr(d.deal_value)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm text-text">Line items</label>
                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={item.description}
                        onChange={(e) => {
                          const next = [...lineItems]
                          next[idx] = { ...next[idx], description: e.target.value }
                          setLineItems(next)
                        }}
                        placeholder="Description"
                        className="min-h-[44px] flex-1 rounded-full border border-text bg-bg px-4 text-sm outline-none focus:border-blue"
                      />
                      <input
                        type="number"
                        min="0"
                        value={item.amount}
                        onChange={(e) => {
                          const next = [...lineItems]
                          next[idx] = { ...next[idx], amount: e.target.value }
                          setLineItems(next)
                        }}
                        placeholder="Amount"
                        className="min-h-[44px] w-28 rounded-full border border-text bg-bg px-4 text-sm outline-none focus:border-blue"
                      />
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setLineItems(lineItems.filter((_, i) => i !== idx))
                          }
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-orange"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLineItems([...lineItems, { description: '', amount: '' }])
                  }
                  className="mt-2 text-sm text-blue hover:underline"
                >
                  + Add line item
                </button>
              </div>

              <div className="rounded-2xl border border-text/10 bg-white p-4">
                <p className="text-sm text-text/60">Subtotal</p>
                <p className="text-lg font-semibold text-text">{formatPkr(subtotal)}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-text bg-bg px-4 py-2.5 text-sm outline-none focus:border-blue"
                />
              </div>

              {error && <p className="text-sm text-orange">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => handleCreate(e, false)}
                  className="min-h-[52px] flex-1 rounded-full border border-text/20 bg-white py-3 text-sm font-bold text-text disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => handleCreate(e, true)}
                  className="min-h-[52px] flex-1 rounded-full bg-green py-3 text-sm font-bold text-text disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setPaymentModal(null)}
          role="presentation"
        >
          <div
            className="flex w-full flex-col bg-bg p-6 sm:max-w-md sm:rounded-[20px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-blue">Record Payment</h2>
                <p className="text-sm text-text/60">{paymentModal.invoice_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMarkPaid} className="space-y-4">
              <p className="text-sm text-text">
                Amount: <strong>{formatPkr(paymentModal.total)}</strong>
              </p>

              <div>
                <label className="mb-1.5 block text-sm text-text">Payment method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Reference number</label>
                <input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text">Date paid</label>
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              {error && <p className="text-sm text-orange">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="min-h-[52px] w-full rounded-full bg-green py-3 text-sm font-bold text-text disabled:opacity-50"
              >
                {saving ? 'Recording…' : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
