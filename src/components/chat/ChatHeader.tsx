type Props = {
  clientName: string
}

export function ChatHeader({ clientName }: Props) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-text/10 bg-bg px-4 py-3">
      <img src="/logo.png" alt="ACE Altius Consulting" className="h-10 w-auto" />
      <h1 className="text-sm font-semibold text-blue">Ace Assistant</h1>
      <span className="max-w-[100px] truncate rounded-full bg-[#E48328] px-3 py-1 text-xs font-medium text-[#0A3F3A]">
        {clientName}
      </span>
    </header>
  )
}
