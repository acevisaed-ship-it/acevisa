'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, formatPkr, type PaymentMethod } from '@/lib/admin/dealTypes'

type Client = { id: string; name: string }
type Deal = { id: string; client_id: string; service_type: string }
type Product = { id: string; name: string }
type Invoice = {
  id: string; invoice_number: string; client_id: string; client_name: string; total: number; received: number; remaining: number
  currency: string; status: string; due_date: string | null; created_at: string
}
type Line = { description: string; amount: string }

/**
 * The counselor's Accounts section: create invoices for their own clients and record incoming payments.
 * No expenses, refunds, profit, commissions or other people's data are reachable from here.
 */
export function MyAccountsPanel() {
  const [clients, setClients] = useState<Client[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [clientId, setClientId] = useState('')
  const [dealId, setDealId] = useState('')
  const [productId, setProductId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ description: '', amount: '' }])
  const [busy, setBusy] = useState(false)
  const [pay, setPay] = useState<Invoice | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [payRef, setPayRef] = useState('')
  const [payDate, setPayDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/counselor/accounts')
      if (!res.ok) { setMsg('Could not load your accounts'); return }
      const json = await res.json()
      setClients(json.clients ?? []); setDeals(json.deals ?? []); setProducts(json.products ?? []); setInvoices(json.invoices ?? [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const clientDeals = useMemo(() => deals.filter((d) => d.client_id === clientId), [deals, clientId])
  const totals = useMemo(() => ({
    invoiced: invoices.reduce((s, i) => s + i.total, 0),
    received: invoices.reduce((s, i) => s + i.received, 0),
    outstanding: invoices.reduce((s, i) => s + i.remaining, 0),
  }), [invoices])

  async function createInvoice(sendAfter: boolean) {
    setMsg('')
    if (!clientId) { setMsg('Choose a client'); return }
    const items = lines.filter((l) => l.description.trim() && Number(l.amount) > 0).map((l) => ({ description: l.description.trim(), amount: Number(l.amount) }))
    if (items.length === 0) { setMsg('Add at least one line with a description and amount'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, deal_id: dealId || null, product_id: productId || undefined, line_items: items, due_date: dueDate || null, notes }),
      })
      const json = await res.json()
      if (!res.ok) { setMsg(json.error || 'Could not create invoice'); return }
      let note = `Invoice ${json.invoice?.invoice_number ?? ''} created as a draft`
      if (sendAfter && json.invoice?.id) {
        const sres = await fetch(`/api/admin/invoices/${json.invoice.id}/send`, { method: 'POST' })
        const sjson = await sres.json()
        note = sres.ok ? (sjson.message || 'Invoice sent to the client') : `Created, but sending failed: ${sjson.error || 'unknown error'}`
      }
      setMsg(note)
      setShowForm(false); setClientId(''); setDealId(''); setProductId(''); setDueDate(''); setNotes(''); setLines([{ description: '', amount: '' }])
      await load()
    } finally { setBusy(false) }
  }

  async function sendInvoice(inv: Invoice) {
    setMsg('')
    const res = await fetch(`/api/admin/invoices/${inv.id}/send`, { method: 'POST' })
    const json = await res.json()
    setMsg(res.ok ? (json.message || 'Invoice sent') : (json.error || 'Could not send invoice'))
    if (res.ok) await load()
  }

  async function recordPayment() {
    if (!pay) return
    setBusy(true); setMsg('')
    try {
      const res = await fetch(`/api/admin/invoices/${pay.id}/payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payAmount ? Number(payAmount) : undefined, payment_method: payMethod, reference_number: payRef, paid_at: payDate || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setMsg(json.error || 'Could not record payment'); return }
      setMsg(`Payment of ${formatPkr(json.amount)} recorded${json.fullyPaid ? ' (invoice fully paid)' : `, ${formatPkr(json.remaining)} remaining`}`)
      setPay(null); setPayAmount(''); setPayRef(''); setPayDate('')
      await load()
    } finally { setBusy(false) }
  }

  const input = 'glass-input rounded-full px-3 py-2 text-sm text-white'

  return (
    <div className="flex flex-col gap-5 text-sm text-white">
      <div className="flex flex-wrap gap-3">
        {[['Invoiced', totals.invoiced], ['Received', totals.received], ['Outstanding', totals.outstanding]].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl px-4 py-3 glass-card"><p className="text-xs text-white/50">{label}</p><p className="text-lg font-semibold">{formatPkr(Number(value))}</p></div>))}
        <button className="ml-auto min-h-[44px] self-center rounded-full px-5 btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'New invoice'}</button>
      </div>

      {msg && <p className="text-amber-300">{msg}</p>}

      {showForm && (
        <div className="rounded-2xl p-4 glass-card">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">Client
              <select className={input} value={clientId} onChange={(e) => { setClientId(e.target.value); setDealId('') }}>
                <option value="">Choose…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="flex flex-col gap-1">Case (optional)
              <select className={input} value={dealId} onChange={(e) => setDealId(e.target.value)} disabled={!clientId}>
                <option value="">No case</option>{clientDeals.map((d) => <option key={d.id} value={d.id}>{d.service_type}</option>)}</select></label>
            <label className="flex flex-col gap-1">Product / service (optional)
              <select className={input} value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">None</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="flex flex-col gap-1">Due date
              <input type="date" className={input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {lines.map((l, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input className={`${input} min-w-[220px] flex-1`} placeholder="Description" value={l.description} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                <input className={`${input} w-36`} placeholder="Amount (PKR)" inputMode="decimal" value={l.amount} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                {lines.length > 1 && <button className="text-xs underline" onClick={() => setLines(lines.filter((_, j) => j !== i))}>remove</button>}
              </div>))}
            <button className="w-fit text-xs underline" onClick={() => setLines([...lines, { description: '', amount: '' }])}>+ add line</button>
          </div>
          <label className="mt-3 flex flex-col gap-1">Notes
            <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="min-h-[44px] rounded-full px-5 glass-input" disabled={busy} onClick={() => void createInvoice(false)}>Save as draft</button>
            <button className="min-h-[44px] rounded-full px-5 btn-primary" disabled={busy} onClick={() => void createInvoice(true)}>{busy ? 'Working…' : 'Save and send to client'}</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl glass-card">
        <table className="w-full">
          <thead><tr className="text-left text-white/60">
            <th className="p-3">Invoice</th><th className="p-3">Client</th><th className="p-3">Total</th><th className="p-3">Received</th>
            <th className="p-3">Remaining</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-t border-white/10">
                <td className="whitespace-nowrap p-3">{i.invoice_number}</td><td className="p-3">{i.client_name}</td>
                <td className="whitespace-nowrap p-3">{formatPkr(i.total)}</td><td className="whitespace-nowrap p-3">{formatPkr(i.received)}</td>
                <td className="whitespace-nowrap p-3">{formatPkr(i.remaining)}</td><td className="p-3">{i.status}</td>
                <td className="whitespace-nowrap p-3">
                  {i.status === 'draft' && <button className="mr-3 text-xs underline" onClick={() => void sendInvoice(i)}>Send</button>}
                  {i.remaining > 0 && i.status !== 'draft' && i.status !== 'cancelled' && (
                    <button className="text-xs underline" onClick={() => { setPay(i); setPayAmount(String(i.remaining)) }}>Record payment</button>)}
                </td>
              </tr>))}
            {!loading && invoices.length === 0 && <tr><td className="p-4 text-white/50" colSpan={7}>No invoices yet. Create one for one of your clients.</td></tr>}
            {loading && <tr><td className="p-4 text-white/50" colSpan={7}>Loading…</td></tr>}
          </tbody>
        </table>
      </div>

      {pay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl p-5 glass-card">
            <h3 className="mb-1 text-base font-semibold">Record payment</h3>
            <p className="mb-4 text-white/60">{pay.invoice_number} · {pay.client_name} · remaining {formatPkr(pay.remaining)}</p>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">Amount received (PKR)
                <input className={input} inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></label>
              <label className="flex flex-col gap-1">Method
                <select className={input} value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}</select></label>
              <label className="flex flex-col gap-1">Reference (optional)
                <input className={input} value={payRef} onChange={(e) => setPayRef(e.target.value)} /></label>
              <label className="flex flex-col gap-1">Date received (optional)
                <input type="date" className={input} value={payDate} onChange={(e) => setPayDate(e.target.value)} /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="min-h-[40px] rounded-full px-4 glass-input" onClick={() => setPay(null)}>Cancel</button>
              <button className="min-h-[40px] rounded-full px-4 btn-primary" disabled={busy} onClick={() => void recordPayment()}>{busy ? 'Saving…' : 'Record payment'}</button>
            </div>
          </div>
        </div>)}
    </div>
  )
}
