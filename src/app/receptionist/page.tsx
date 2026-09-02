import { ReceptionistLookup } from '@/components/receptionist/ReceptionistLookup'
import { ReceptionistWalkIn } from '@/components/receptionist/ReceptionistWalkIn'
import { ReceptionistDailyLog } from '@/components/receptionist/ReceptionistDailyLog'
import { ReceptionistCorrectionRequest } from '@/components/receptionist/ReceptionistCorrectionRequest'
import { RegisterFormCollapsible } from '@/components/receptionist/RegisterFormCollapsible'
import { StaffAppInstallCard } from '@/components/StaffAppInstallCard'

export default function ReceptionistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bg">Front Desk</h1>
        <p className="mt-1 text-sm text-bg/60">
          Log every walk-in below, request information corrections, or register a brand-new client further down.
        </p>
      </div>
      <StaffAppInstallCard />

      {/* Actions rail (lime) is first in the DOM so it stacks first on
          mobile — walk-in/register are the two things front desk does all
          day. lg:order pins it to the wide right column on desktop; the
          tools rail (blue) takes the narrower left column. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
        <div className="flex flex-col gap-5 lg:order-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-bg/40">Do this now</p>
          <ReceptionistWalkIn />
          <RegisterFormCollapsible />
        </div>

        <div className="flex flex-col gap-4 lg:order-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-bg/40">Find &amp; reference</p>
          <ReceptionistLookup />
          <ReceptionistCorrectionRequest />
          <ReceptionistDailyLog />
        </div>
      </div>
    </div>
  )
}
