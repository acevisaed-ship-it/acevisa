type Props = {
  children: React.ReactNode
  className?: string
}

export function BriefCard({ children, className = '' }: Props) {
  return (
    <section
      className={`mb-6 rounded-card border border-white/10 glass-card crisp-on-dark p-6 ${className}`}
    >
      {children}
    </section>
  )
}
