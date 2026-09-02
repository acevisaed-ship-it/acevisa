// Small duotone-line icons for the front-desk action/tool cards — a step
// warmer than a stock icon set, simple enough to read at 20-24px sitting
// directly on a gradient card. All use currentColor so they inherit the
// card's text color (text-blue on lime cards, text-orange/text-green on blue).

type IconProps = { className?: string }

export function WalkInIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="7" width="20" height="34" rx="3" stroke="currentColor" strokeWidth="2.6" />
      <path
        d="M29 24h10M35 19l4 5-4 5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="24" r="1.8" fill="currentColor" />
    </svg>
  )
}

export function RegisterIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="19" cy="17" r="7" stroke="currentColor" strokeWidth="2.6" />
      <path d="M8 39c1.5-8 6-12 11-12s9.5 4 11 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      {/* Plus badge — deliberately not currentColor: it needs to read against
          its own dark circle regardless of the icon's ambient text color. */}
      <circle cx="35" cy="14" r="7.5" fill="currentColor" />
      <path d="M35 10.5v7M31.5 14h7" stroke="#E6E8E7" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function LookupIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="11" stroke="currentColor" strokeWidth="2.6" />
      <path d="M28.5 28.5L39 39" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M14 20h12M20 14v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

export function CorrectionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 8h16l8 8v24a2 2 0 01-2 2H12a2 2 0 01-2-2V10a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M28 8v8h8" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M17 33l2.3-6.4 11-11 4.1 4.1-11 11L17 33z" fill="currentColor" />
    </svg>
  )
}

export function DailyLogIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="7" width="26" height="34" rx="3" stroke="currentColor" strokeWidth="2.4" />
      <path d="M15 17h14M15 24h14M15 31h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="35" cy="34" r="8" fill="currentColor" opacity="0.16" />
      <circle cx="35" cy="34" r="8" stroke="currentColor" strokeWidth="2.2" />
      <path d="M35 30v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ClassAttendanceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 8L6 16l18 8 18-8-18-8z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M13 20v9c0 2.8 5 5 11 5s11-2.2 11-5v-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M40 17v11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="34" cy="35" r="7.5" fill="currentColor" />
      <path d="M31 35l2 2 4-4.5" stroke="#E6E8E7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
