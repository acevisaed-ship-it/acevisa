type Props = {
  label: string
  value: number
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="rounded-2xl bg-bg px-5 py-4">
      <p className="text-3xl font-semibold text-blue">{value}</p>
      <p className="mt-1 text-sm text-text">{label}</p>
    </div>
  )
}
