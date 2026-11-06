import { redirect } from 'next/navigation'
import { StudentSidebar } from '@/components/student/StudentSidebar'
import { TermsDisclaimer } from '@/components/invoices/TermsDisclaimer'
import { createAdminClient, getAuthenticatedClient } from '@/lib/supabase/server'
import { mapInvoice } from '@/lib/invoices/mapInvoice'
import { INVOICE_SELECT } from '@/lib/invoices/types'
import { formatPkr } from '@/lib/admin/dealTypes'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

export default async function StudentInvoicesPage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/portal/login')

  const sessionClient = await getAuthenticatedClient()
  if (!sessionClient || sessionClient.id !== clientId) {
    redirect('/portal/login')
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .in('status', ['sent', 'paid', 'overdue'])
    .order('created_at', { ascending: false })

  const invoices = (data ?? []).map((row) => mapInvoice(row as Record<string, unknown>))

  return (
    <div className="flex min-h-screen bg-bg">
      <StudentSidebar clientId={clientId} />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-orange">My invoices</p>
            <h1 className="mt-1 text-2xl font-semibold text-text">Invoices</h1>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-text/60">No issued invoices yet.</p>
          ) : (
            invoices.map((invoice) => (
              <article key={invoice.id} className="space-y-4 rounded-[20px] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-text/70">{invoice.invoice_number}</p>
                    <p className="text-lg font-semibold text-text">{formatPkr(invoice.total)}</p>
                    <p className="text-xs text-text/50">{invoice.status}</p>
                  </div>
                  <p className="text-sm text-text/60">
                    Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-PK') : '—'}
                  </p>
                </div>
                <ul className="text-sm text-text/80">
                  {invoice.line_items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-4 py-1">
                      <span>{item.description}</span>
                      <span>{formatPkr(item.amount)}</span>
                    </li>
                  ))}
                </ul>
                <TermsDisclaimer snapshot={invoice.terms_snapshot} />
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
