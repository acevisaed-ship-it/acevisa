type Props = {
  label: string
  value: number | string
  valueColor?: 'green' | 'orange' | 'red' | 'default'
}

const valueColorClasses = {
  green: 'text-green-600',
  orange: 'text-orange-500',
  red: 'text-red-600',
  default: 'text-blue',
} as const

export function StatCard({ label, value, valueColor = 'default' }: Props) {
  return (
    <div className="rounded-2xl bg-grad-bg crisp px-5 py-4">
      <p className={`text-3xl font-semibold ${valueColorClasses[valueColor]}`}>{value}</p>
      <p className="mt-1 text-sm text-text">{label}</p>
    </div>
  )
}
