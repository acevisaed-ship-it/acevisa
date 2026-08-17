import { ReceptionistLookup } from '@/components/receptionist/ReceptionistLookup'
import { ReceptionistWalkIn } from '@/components/receptionist/ReceptionistWalkIn'
import { ReceptionistCorrectionRequest } from '@/components/receptionist/ReceptionistCorrectionRequest'
import { ReceptionistRegisterForm } from '@/components/receptionist/ReceptionistRegisterForm'

export default function ReceptionistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bg">Front Desk</h1>
        <p className="mt-1 text-sm text-bg/60">
          Log every walk-in below, request information corrections, or register a brand-new client further down.
        </p>
      </div>
      <ReceptionistWalkIn />
      <ReceptionistLookup />
      <ReceptionistCorrectionRequest />
      <ReceptionistRegisterForm />
    </div>
  )
}
