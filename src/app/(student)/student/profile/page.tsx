import { redirect } from 'next/navigation'
import { StudentSidebar } from '@/components/student/StudentSidebar'
import { StudentEmailForm } from '@/components/student/StudentEmailForm'
import { createAdminClient, getAuthenticatedClient } from '@/lib/supabase/server'
import { studentContactEmail } from '@/lib/auth/studentAuthEmail'
import Link from 'next/link'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

export default async function StudentProfilePage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/portal/login')

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, phone, email, city, language, client_code, interested_in, target_country, language_test_interest, avatar_url')
    .eq('id', clientId)
    .maybeSingle()

  if (!client) redirect('/portal/login')

  const sessionClient = await getAuthenticatedClient()
  const canEditEmail = sessionClient?.id === client.id
  const contactEmail = studentContactEmail(client.email)

  const fields: { label: string; value: string }[] = [
    { label: 'Client ID', value: client.client_code || '—' },
    { label: 'Phone', value: client.phone },
    { label: 'City', value: client.city || '—' },
    { label: 'Language', value: client.language || '—' },
    { label: 'Interested in', value: client.interested_in || '—' },
    ...(client.language_test_interest
      ? [{ label: 'Language test', value: client.language_test_interest }]
      : []),
    { label: 'Target country', value: client.target_country || '—' },
  ]

  return (
    <div className="flex min-h-screen bg-bg">
      <StudentSidebar clientId={clientId} />

      <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-lg space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-orange">My Profile</p>
            <h1 className="mt-1 text-2xl font-semibold text-text md:text-3xl">{client.name}</h1>
            <p className="mt-1 text-sm text-text/60">
              Keep your contact details up to date so your counselor can reach you.
            </p>
          </div>

          <div className="rounded-[20px] border border-text/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-4">
              {client.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={client.avatar_url}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-text text-xl font-bold text-white">
                  {client.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-text">{client.name}</p>
                <p className="text-sm text-text/50">{client.phone}</p>
              </div>
            </div>

            <dl className="space-y-3">
              {fields.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 border-t border-text/5 pt-3 text-sm">
                  <dt className="text-text/50">{f.label}</dt>
                  <dd className="text-right font-medium text-text">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {canEditEmail ? (
            <StudentEmailForm initialEmail={contactEmail} variant="light" />
          ) : (
            <div className="rounded-[20px] border border-text/10 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-text">Email</h3>
              <p className="mt-2 break-all text-sm text-text">
                {contactEmail || 'Not set'}
              </p>
              <p className="mt-3 text-sm text-text/60">
                Sign in to add or change your email so you can reset your password and get updates.
              </p>
              <Link
                href="/portal/login"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-grad-orange px-6 py-3 text-sm font-medium text-white"
              >
                Sign in to manage email
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
