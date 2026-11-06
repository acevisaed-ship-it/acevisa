import type { TermsSnapshot } from '@/lib/invoices/types'

export function TermsDisclaimer({ snapshot }: { snapshot: TermsSnapshot | null }) {
  if (!snapshot) {
    return (
      <p className="text-sm text-text/50">
        Disclaimer will appear here after this invoice is issued with a stored terms snapshot.
      </p>
    )
  }

  const agreed = snapshot.agreedAt
    ? new Date(snapshot.agreedAt).toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <section className="space-y-4 rounded-[20px] border border-text/10 bg-white p-5 text-text">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide">Disclaimer — policy and terms of service</h2>
        <p className="mt-1 text-xs text-text/60">
          {agreed ? `Agreed on ${agreed}. ` : ''}
          This is the wording stored with this invoice. It does not change if terms are updated later.
        </p>
      </div>
      <article>
        <h3 className="text-sm font-semibold">
          {snapshot.product.title} · v{snapshot.product.version}
        </h3>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-text/80">
          {snapshot.product.body}
        </pre>
      </article>
      <article>
        <h3 className="text-sm font-semibold">
          {snapshot.general.title} · v{snapshot.general.version}
        </h3>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-text/80">
          {snapshot.general.body}
        </pre>
      </article>
      <p className="text-xs text-text/50">
        This record is evidence of agreement. It is not legal advice. Have a lawyer review the wording
        before production use.
      </p>
    </section>
  )
}
