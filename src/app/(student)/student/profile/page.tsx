import { redirect } from 'next/navigation'
import { StudentSidebar } from '@/components/student/StudentSidebar'
import { createAdminClient } from '@/lib/supabase/server'
import type { AIProfileData } from '@/types'
import {
  Globe, GraduationCap, CalendarDays, BookOpen,
  Languages, Wallet, CreditCard, AlertTriangle, MessageCircle,
  MapPin, Star,
} from 'lucide-react'

type Props = {
  searchParams: Promise<{ clientId?: string }>
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
}) {
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

function passportLabel(val: boolean | null | undefined): string | null {
  if (val === true) return 'Yes — passport available'
  if (val === false) return 'No — passport not yet obtained'
  return null
}

// Friendly label for service_match internal codes
function serviceLabel(s: string | null | undefined): string | null {
  if (!s || s === 'unknown') return null
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function StudentProfilePage({ searchParams }: Props) {
  const { clientId } = await searchParams
  if (!clientId) redirect('/')

  const supabase = createAdminClient()

  const [{ data: client }, { data: aiRow }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, city, language')
      .eq('id', clientId)
      .single(),
    supabase
      .from('ai_profiles')
      .select(
        'profile_json, generated_at, detected_language, detected_region, service_match, qualification_score, last_updated'
      )
      .eq('client_id', clientId)
      .maybeSingle(),
  ])

  if (!client) redirect('/')

  // profile_json is set only after a full conversation; individual columns are set per-message
  const profile = aiRow?.profile_json as AIProfileData | null
  const hasAnyAiData = !!aiRow

  // Merge: profile_json fields take priority; fall back to individual columns
  const goalCountry = profile?.goal_country ?? (aiRow?.detected_region !== 'unknown' ? aiRow?.detected_region : null)
  const studyField = profile?.study_field
  const startDate = profile?.start_date
  const educationLevel = profile?.education_level
  const englishTest = profile?.english_test_status
  const budgetType = profile?.budget_type
  const hasPassport = profile?.has_passport
  const visaRefusals = profile?.visa_refusals
  const mainConcern = profile?.main_concern
  const preferredLanguage = profile?.goal_country
    ? null // if full profile exists, language row is redundant
    : (aiRow?.detected_language && aiRow.detected_language !== 'unknown' ? aiRow.detected_language : null)
  const serviceMatch = !profile ? serviceLabel(aiRow?.service_match) : null
  const qualScore = aiRow?.qualification_score

  const hasAnyField =
    goalCountry || studyField || startDate || educationLevel ||
    englishTest || budgetType || hasPassport !== undefined ||
    visaRefusals || mainConcern || preferredLanguage || serviceMatch

  return (
    <div className="flex min-h-screen">
      <StudentSidebar clientId={clientId} />
      <main className="flex-1 px-4 py-6 pt-20 lg:px-8 lg:pt-8">
        <h1 className="text-2xl font-semibold text-[#0A3F3A]">My Profile</h1>
        <p className="mt-1 text-sm text-[#0A3F3A]/50">
          Information your counselor has captured about your case. Let your counselor know if anything needs updating.
        </p>

        {/* Basic info card */}
        <div className="mt-6 rounded-2xl bg-[#0A3F3A] p-5 text-white">
          <p className="text-xs text-white/50">Full name</p>
          <p className="mt-0.5 text-xl font-bold">{client.name}</p>
          {client.city && (
            <p className="mt-1 text-sm text-white/60">{client.city}</p>
          )}
          {hasAnyAiData && qualScore !== undefined && qualScore > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-[#B7C733]" />
              <p className="text-xs text-white/60">
                Profile completeness: <span className="font-semibold text-white">{qualScore}/10</span>
              </p>
            </div>
          )}
        </div>

        {!hasAnyAiData || !hasAnyField ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#0A3F3A]/20 p-6 text-center text-sm text-[#0A3F3A]/50">
            Your profile details will appear here after your first chat session with our AI assistant.
          </div>
        ) : (
          <div className="mt-5 space-y-3">

            {/* Destination / study plans */}
            {(goalCountry || studyField || startDate || educationLevel) && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Study Plans</h2>
                <Row icon={Globe} label="Target Country / Region" value={goalCountry ?? undefined} />
                <Row icon={BookOpen} label="Field of Study" value={studyField ?? undefined} />
                <Row icon={CalendarDays} label="Intended Start Date" value={startDate ?? undefined} />
                <Row icon={GraduationCap} label="Education Level" value={educationLevel ?? undefined} />
              </>
            )}

            {/* Language & budget */}
            {(englishTest || budgetType || preferredLanguage) && (
              <>
                <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Language & Budget</h2>
                <Row icon={Languages} label="Preferred Language" value={preferredLanguage ?? undefined} />
                <Row icon={Languages} label="English Test Status" value={englishTest ?? undefined} />
                <Row icon={Wallet} label="Budget Category" value={budgetType ?? undefined} />
              </>
            )}

            {/* Travel documents */}
            {(hasPassport !== null && hasPassport !== undefined || visaRefusals) && (
              <>
                <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Travel Documents</h2>
                <Row icon={CreditCard} label="Passport" value={passportLabel(hasPassport) ?? undefined} />
                <Row icon={AlertTriangle} label="Previous Visa Refusals" value={visaRefusals ?? undefined} />
              </>
            )}

            {/* Service match (shown only before full profile is ready) */}
            {serviceMatch && (
              <>
                <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Recommended Service</h2>
                <Row icon={MapPin} label="Best matched service" value={serviceMatch} />
              </>
            )}

            {/* Main concern */}
            {mainConcern && (
              <>
                <h2 className="pt-2 text-xs font-semibold uppercase tracking-wider text-[#0A3F3A]/40">Your Concern</h2>
                <div className="flex items-start gap-3 rounded-2xl border border-[#0A3F3A]/10 bg-white px-4 py-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0A3F3A]/5">
                    <MessageCircle className="h-4 w-4 text-[#0A3F3A]/70" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-[#0A3F3A]/50">Main concern</p>
                    <p className="mt-0.5 text-sm text-[#0A3F3A]">{mainConcern}</p>
                  </div>
                </div>
              </>
            )}

            {/* Partial profile notice */}
            {!profile && (
              <p className="pt-2 text-center text-xs text-[#0A3F3A]/30">
                More profile details will be added as your consultation progresses.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
