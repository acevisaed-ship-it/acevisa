import { parseClientJoin, parseCounselorName } from '@/lib/admin/parseCounselorJoin'
import { displayConsentLabel, type ConsentStatus } from '@/lib/invoices/consentRules'
import type { InvoiceLineItem, TermsSnapshot } from '@/lib/invoices/types'

export function mapInvoice(row: Record<string, unknown>) {
  const client = parseClientJoin(
    row.clients as { name: string; id: string } | { name: string; id: string }[] | null
  )
  const product = row.products as { name: string } | null
  const consentJoin = row.invoice_consents as
    | { status: ConsentStatus; agreed_at: string | null; expires_at: string | null }
    | { status: ConsentStatus; agreed_at: string | null; expires_at: string | null }[]
    | null
  const consent = Array.isArray(consentJoin) ? consentJoin[0] : consentJoin
  const status = row.status as string

  return {
    id: row.id as string,
    invoice_number: row.invoice_number as string,
    client_id: row.client_id as string,
    deal_id: row.deal_id as string | null,
    counselor_id: row.counselor_id as string | null,
    product_id: row.product_id as string | null,
    product_name: product?.name ?? null,
    consent_id: (row.consent_id as string | null) ?? null,
    terms_snapshot: (row.terms_snapshot as TermsSnapshot | null) ?? null,
    issued_at: (row.issued_at as string | null) ?? null,
    line_items: row.line_items as InvoiceLineItem[],
    subtotal: Number(row.subtotal),
    tax_rate: Number(row.tax_rate ?? 0),
    tax_amount: Number(row.tax_amount ?? 0),
    total: Number(row.total),
    currency: row.currency as string,
    status,
    due_date: row.due_date as string | null,
    paid_at: row.paid_at as string | null,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
    client_name: client?.name ?? null,
    counselor_name: parseCounselorName(
      row.counselors as { name: string } | { name: string }[] | null
    ),
    consent_status: consent?.status ?? null,
    consent_agreed_at: consent?.agreed_at ?? null,
    consent_expires_at: consent?.expires_at ?? null,
    consent_label: displayConsentLabel({
      invoiceStatus: status,
      consentStatus: consent?.status ?? null,
      agreedAt: consent?.agreed_at ?? null,
    }),
  }
}

export type MappedInvoice = ReturnType<typeof mapInvoice>
