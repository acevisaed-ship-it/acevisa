import { ReceptionistLookup } from '@/components/receptionist/ReceptionistLookup'
import { ReceptionistRegisterForm } from '@/components/receptionist/ReceptionistRegisterForm'

export default function ReceptionistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bg">Register a New Client</h1>
        <p className="mt-1 text-sm text-bg/60">
          Collect the student&apos;s details below. Their account, portal ID, and login
          credentials will be created and emailed to them automatically.
        </p>
      </div>
      <ReceptionistLookup />
      <ReceptionistRegisterForm />
    </div>
  )
}
