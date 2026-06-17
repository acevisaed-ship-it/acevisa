type Props = {
  label: string
  value: number | string
  valueColor?: 'green' | 'orange' | 'red' | 'default'
}

const valueColorClasses = {
  green: 'text-green',
  orange: 'text-orange',
  red: 'text-red-400',
  default: 'text-white',
} as const

export function StatCard({ label, value, valueColor = 'default' }: Props) {
  return (
    <div className="rounded-2xl glass-card crisp-on-dark px-5 py-4">
      <p className={`text-3xl font-semibold ${valueColorClasses[valueColor]}`}>{value}</p>
      <p className="mt-1 text-sm text-white/60">{label}</p>
    </div>
  )
}
