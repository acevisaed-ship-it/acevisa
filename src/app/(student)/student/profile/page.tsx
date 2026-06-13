import { redirect } from 'next/navigation'
import { StudentSidebar } from '@/components/student/StudentSidebar'
import { createAdminClient } from '@/lib/supabase/server'
import type { AIProfileData } from '@/types'
import {
  Globe, GraduationCap, CalendarDays, BookOpen,
  Languages, Wallet, CreditCard, AlertTriangle, MessageCircle,
} from 'lucide-react'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#0A3F3A]/10 bg-white px-4 py-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0A3F3A]/5">
        <Icon className="h-4 w-4 text-[#0A3F3A]/70" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#0A3F3A]/50">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-[#0A3F3A]">{value}</p>
      </div>
    </div>
  )
}

function passportLabel(val: boolean | null): string | null {
  if (val === true) return 'Yes — passport available'
  if (val === false) return 'No — passport not yet obtained'
  return null
}

export default async function StudentProfilePage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/')

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, city, language')
    .eq('id', clientId)
    .single()

  if (!client) redirect('/')

  const { data: aiProfile } = await supabase
    .from('ai_profiles')
    .select('profile_json, generated_at')
    .eq('client_id', clientId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const profile = aiProfile?.profile_json as AIProfileData | null

  return (
    <div className="flex min-h-screen">
      <StudentSidebar clientId={clientId} />
      <main className="flex-1 px-4 py-6 pt-20 lg:px-8 lg:pt-8">
        <h1 className="text-2xl font-semibold text-[#0A3F3A]">My Profile</h1>
        <p className="mt-1 text-sm text-[#0A3F3A]/50">
          This is the information your counselor has captured about your case. Let your counselor know if anything needs updating.
        </p>

        {/* Basic info */}
        <div className="mt-6 rounded-2xl bg-[#0A3F3A] p-5 text-white">
          <p className="text-xs text-white/50">Full name</p>
          <p className="mt-0.5 text-xl font-bold">{client.name}</p>
          {client.city && (
            <p className="mt-1 text-sm text-white/60">{client.city}</p>
          )}
        </div>

        {!profile ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#0A3F3A]/20 p-6 text-center text-sm text-[#0A3F3A]/50">
            Your profile details will appear here after your first chat session with our AI assistant.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Study Plans</h2>
            <Row icon={Globe} label="Target Country" value={profile.goal_country} />
            <Row icon={BookOpen} label="Field of Study" value={profile.study_field} />
            <Row icon={CalendarDays} label="Intended Start Date" value={profile.start_date} />
            <Row icon={GraduationCap} label="Education Level" value={profile.education_level} />

            <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Language & Budget</h2>
            <Row icon={Languages} label="English Test Status" value={profile.english_test_status} />
            <Row icon={Wallet} label="Budget Category" value={profile.budget_type} />

            <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Travel Documents</h2>
            <Row icon={CreditCard} label="Passport" value={passportLabel(profile.has_passport)} />
            <Row icon={AlertTriangle} label="Previous Visa Refusals" value={profile.visa_refusals} />

            {profile.main_concern && (
              <>
                <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Your Concern</h2>
                <div className="flex items-start gap-3 rounded-2xl border border-[#0A3F3A]/10 bg-white px-4 py-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0A3F3A]/5">
                    <MessageCircle className="h-4 w-4 text-[#0A3F3A]/70" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-[#0A3F3A]/50">Main concern</p>
                    <p className="mt-0.5 text-sm text-[#0A3F3A]">{profile.main_concern}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
