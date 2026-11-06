import { createAdminClient, requireAdmin } from '@/lib/supabase/server'
import { mapInvoice } from '@/lib/invoices/mapInvoice'
import { INVOICE_SELECT } from '@/lib/invoices/types'
import { TermsDisclaimer } from '@/components/invoices/TermsDisclaimer'
import { formatPkr } from '@/lib/admin/dealTypes'
import { PAYMENT_INSTRUCTION_LINES } from '@/lib/invoices/paymentInstructions'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function InvoicePrintPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!data) notFound()
  const invoice = mapInvoice(data as Record<string, unknown>)

  return (
    <main className="min-h-screen bg-white p-8 text-text print:p-0">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center justify-center rounded-xl bg-white px-2.5 py-1.5">
              <img src="/logo.png" alt="ACE Altius Consulting" className="h-9 w-auto" />
            </div>
            <p className="mt-2 text-sm text-text/60">Study Abroad &amp; Immigration Services</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold">INVOICE</h1>
            <p className="font-mono text-sm">{invoice.invoice_number}</p>
            <p className="text-sm text-text/60">{invoice.status.toUpperCase()}</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Bill to</p>
            <p>{invoice.client_name ?? 'Client'}</p>
            {invoice.counselor_name && (
              <p className="text-text/60">Counselor: {invoice.counselor_name}</p>
            )}
          </div>
          <div className="text-right">
            <p>Date: {new Date(invoice.created_at).toLocaleDateString('en-PK')}</p>
            <p>Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-PK') : '—'}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-text/10 text-left">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.map((item, i) => (
              <tr key={i} className="border-b border-text/5">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{formatPkr(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right text-lg font-bold">Total due {formatPkr(invoice.total)}</p>

        <div className="text-sm">
          <p className="font-semibold">Payment instructions</p>
          {PAYMENT_INSTRUCTION_LINES.map((line, i) => (
            <p key={i}>{line || '\u00a0'}</p>
          ))}
        </div>

        {invoice.notes && (
          <div className="text-sm">
            <p className="font-semibold">Notes</p>
            <p>{invoice.notes}</p>
          </div>
        )}

        <TermsDisclaimer snapshot={invoice.terms_snapshot} />
      </div>
    </main>
  )
}
