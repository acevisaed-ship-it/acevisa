import { jsPDF } from 'jspdf'
import { PAYMENT_INSTRUCTION_LINES } from '@/lib/invoices/paymentInstructions'
import type { TermsSnapshot } from '@/lib/invoices/types'

export type InvoicePdfData = {
  invoice_number: string
  client_name: string | null
  counselor_name: string | null
  line_items: { description: string; amount: number }[]
  subtotal: number
  total: number
  due_date: string | null
  notes: string | null
  created_at: string
  status: string
  terms_snapshot?: TermsSnapshot | null
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatAmount(amount: number) {
  return `PKR ${amount.toLocaleString('en-PK')}`
}

export function downloadInvoicePdf(invoice: InvoicePdfData) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('ACE Altius Consulting', margin, y)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text('Study Abroad & Immigration Services', margin, y + 6)
  doc.text('Lahore, Pakistan · acevisa.co', margin, y + 11)
  doc.setTextColor(0)

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth - margin, y, { align: 'right' })

  y += 28

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - margin, y, { align: 'right' })
  y += 6
  doc.text(`Date: ${formatDate(invoice.created_at)}`, pageWidth - margin, y, { align: 'right' })
  y += 6
  doc.text(`Due: ${formatDate(invoice.due_date)}`, pageWidth - margin, y, { align: 'right' })
  y += 6
  doc.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - margin, y, { align: 'right' })

  y += 14
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.client_name ?? 'Client', margin, y)
  if (invoice.counselor_name) {
    y += 6
    doc.setTextColor(100)
    doc.text(`Counselor: ${invoice.counselor_name}`, margin, y)
    doc.setTextColor(0)
  }

  y += 16

  const colDesc = margin
  const colAmount = pageWidth - margin
  const tableTop = y

  doc.setFillColor(240, 240, 240)
  doc.rect(margin, tableTop, pageWidth - margin * 2, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Description', colDesc + 2, tableTop + 5.5)
  doc.text('Amount', colAmount - 2, tableTop + 5.5, { align: 'right' })

  y = tableTop + 12
  doc.setFont('helvetica', 'normal')

  for (const item of invoice.line_items) {
    const descLines = doc.splitTextToSize(item.description, pageWidth - margin * 2 - 40)
    doc.text(descLines, colDesc + 2, y)
    doc.text(formatAmount(item.amount), colAmount - 2, y, { align: 'right' })
    y += Math.max(descLines.length * 5, 7)
  }

  y += 4
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.text('Subtotal', colAmount - 50, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(formatAmount(invoice.subtotal), colAmount - 2, y, { align: 'right' })
  y += 7

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Total Due', colAmount - 50, y, { align: 'right' })
  doc.text(formatAmount(invoice.total), colAmount - 2, y, { align: 'right' })

  y += 16
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Payment Instructions', margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const line of PAYMENT_INSTRUCTION_LINES) {
    doc.text(line, margin, y)
    y += 5
  }

  if (invoice.notes?.trim()) {
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Notes', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const noteLines = doc.splitTextToSize(invoice.notes.trim(), pageWidth - margin * 2)
    doc.text(noteLines, margin, y)
  }

  if (invoice.terms_snapshot) {
    const snapshot = invoice.terms_snapshot
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      y = 20
    }
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0)
    doc.text('Disclaimer — policy and terms of service', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const agreed = snapshot.agreedAt
      ? `Agreed on ${formatDate(snapshot.agreedAt)}. Stored snapshot; later edits do not change this invoice.`
      : 'Stored snapshot at issue time; later edits do not change this invoice.'
    const agreedLines = doc.splitTextToSize(agreed, pageWidth - margin * 2)
    doc.text(agreedLines, margin, y)
    y += agreedLines.length * 4 + 4

    for (const docBlock of [snapshot.product, snapshot.general]) {
      if (y > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage()
        y = 20
      }
      doc.setFont('helvetica', 'bold')
      doc.text(`${docBlock.title} · v${docBlock.version}`, margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      const bodyLines = doc.splitTextToSize(docBlock.body, pageWidth - margin * 2)
      for (const line of bodyLines) {
        if (y > doc.internal.pageSize.getHeight() - 16) {
          doc.addPage()
          y = 20
        }
        doc.text(line, margin, y)
        y += 4
      }
      y += 4
    }
  }

  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text(
    'Thank you for choosing ACE Altius Consulting.',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 12,
    { align: 'center' }
  )

  doc.save(`${invoice.invoice_number}.pdf`)
}
