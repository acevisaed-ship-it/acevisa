export const PAYMENT_INSTRUCTION_LINES = [
  'Bank: Meezan Bank',
  'Account Name: ACE Altius Consulting',
  'Account Number: 0123-4567890-1',
  'IBAN: PK00MEZN0001234567890001',
  '',
  'Alternative: Easypaisa / JazzCash on 0300-1234567',
  'Please include invoice number as payment reference.',
]

export function paymentInstructionsHtml(): string {
  const lines = PAYMENT_INSTRUCTION_LINES.map((line) =>
    line ? `<div>${line}</div>` : '<div style="height:8px"></div>'
  ).join('')
  return `
    <div style="margin:16px 0;padding:16px;background:#F4F5F4;border-radius:12px">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0A3F3A">Payment instructions</p>
      <div style="font-size:12px;line-height:1.6;color:#0A3F3A">${lines}</div>
    </div>`
}
