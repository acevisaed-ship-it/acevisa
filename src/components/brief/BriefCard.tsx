type Props = {
  children: React.ReactNode
  className?: string
}

export function BriefCard({ children, className = '' }: Props) {
  return (
    <section
      className={`mb-6 rounded-card border border-text/10 bg-white/80 p-6 ${className}`}
    >
      {children}
    </section>
  )
}
