import { EmailClient } from '@/components/email/EmailClient'

export default function AdminEmailPage() {
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Email</h1>
        <p className="mt-1 text-sm text-white/60">Official ACE Altius inbox</p>
      </div>
      <EmailClient />
    </main>
  )
}
