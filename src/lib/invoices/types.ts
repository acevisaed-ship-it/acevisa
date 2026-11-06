export type TermsSnapshotDoc = {
  id: string
  title: string
  version: number
  body: string
  scope: 'general' | 'product'
}

export type TermsSnapshot = {
  agreedAt: string | null
  general: TermsSnapshotDoc
  product: TermsSnapshotDoc
}

export type InvoiceLineItem = { description: string; amount: number }

const INVOICE_COLUMNS =
  'id, invoice_number, client_id, deal_id, counselor_id, product_id, consent_id, terms_snapshot, issued_at, line_items, subtotal, tax_rate, tax_amount, total, currency, status, due_date, paid_at, notes, created_at, counselors!counselor_id(name), products(name), invoice_consents!consent_id(status, agreed_at, expires_at)' as const

export const INVOICE_SELECT = `${INVOICE_COLUMNS}, clients(name, id)` as const

export const INVOICE_SELECT_BRANCH = `${INVOICE_COLUMNS}, clients!inner(name, id, branch_id)` as const
