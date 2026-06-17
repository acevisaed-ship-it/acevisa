import Link from 'next/link'
import { Mail, Phone, ArrowRight } from 'lucide-react'
import { getCounselorsWithCounts } from '@/lib/admin/getCounselorsWithCounts'

export default async function AdminCounselorsPage() {
  const counselors = await getCounselorsWithCounts()

  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-white md:text-3xl">Counselors</h1>
      <p className="mt-1 text-sm text-white/60">
        {counselors.length} active counselor{counselors.length === 1 ? '' : 's'}
      </p>

      {counselors.length === 0 ? (
        <p className="mt-8 text-white/50">No active counselors found.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {counselors.map((counselor) => (
            <article
              key={counselor.id}
              className="flex flex-col rounded-2xl border border-white/10 glass-card crisp-on-dark p-5"
            >
              <h2 className="text-lg font-bold text-white">{counselor.name}</h2>

              <div className="mt-3 space-y-1.5 text-sm text-white/60">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-white/40" />
                  {counselor.email}
                </p>
                {counselor.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-white/40" />
                    {counselor.phone}
                  </p>
                )}
              </div>

              <p className="mt-4 text-sm font-medium text-white/70">
                {counselor.clientCount} client{counselor.clientCount === 1 ? '' : 's'}
                <span className="mx-2 text-white/20">|</span>
                {counselor.openTaskCount} open task{counselor.openTaskCount === 1 ? '' : 's'}
              </p>

              <Link
                href={`/admin/counselors/${counselor.id}/dashboard`}
                className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-grad-blue crisp-on-dark px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                View Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
