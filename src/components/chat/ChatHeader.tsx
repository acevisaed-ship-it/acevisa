type Props = {
  clientName: string
  counselorAvatarUrl?: string | null
  counselorName?: string
}

function CounselorAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl?: string | null
  name: string
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${name} profile`}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
      style={{ backgroundColor: '#B7C733', color: '#0A3F3A' }}
    >
      {initial}
    </span>
  )
}

export function ChatHeader({ clientName, counselorAvatarUrl, counselorName }: Props) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-text/10 bg-bg px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-xl bg-white/95 px-2 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ACE Altius Consulting" className="h-8 w-auto" />
        </span>
        {counselorName && (
          <CounselorAvatar avatarUrl={counselorAvatarUrl} name={counselorName} />
        )}
      </div>
      <h1 className="text-sm font-semibold text-blue">Ace Assistant</h1>
      <span className="max-w-[100px] truncate rounded-full bg-[#E48328] px-3 py-1 text-xs font-medium text-[#0A3F3A]">
        {clientName}
      </span>
    </header>
  )
}
