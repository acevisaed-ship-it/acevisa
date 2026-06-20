import { getAuthenticatedCounselor, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmailClient } from '@/components/email/EmailClient'

export default async function CounselorEmailPage() {
  const counselor = await getAuthenticatedCounselor()
  if (!counselor) redirect('/login')

  // Check if this counselor has an email account configured
  const supabase = createAdminClient()
  const { data: emailAccount } = await supabase
    .from('counselor_email_accounts')
    .select('email_address, is_active')
    .eq('counselor_id', counselor.id)
    .eq('is_active', true)
    .maybeSingle()

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Email</h1>
        <p className="mt-1 text-sm text-white/60">
          {emailAccount ? emailAccount.email_address : 'No email account configured'}
        </p>
      </div>

      {emailAccount ? (
        <EmailClient />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 glass-card p-12 text-center">
          <p className="text-lg font-semibold text-white/70">Email not set up yet</p>
          <p className="mt-2 text-sm text-white/40">
            Ask your admin to connect your email account from the Counselors page.
          </p>
        </div>
      )}
    </main>
  )
}
