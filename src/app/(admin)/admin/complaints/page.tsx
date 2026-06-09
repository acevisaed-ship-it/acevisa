function AdminPlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <main className="flex-1 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-blue md:text-3xl">{title}</h1>
      <p className="mt-2 text-text/60">{subtitle}</p>
    </main>
  )
}

export default function AdminComplaintsPage() {
  return (
    <AdminPlaceholder title="Complaints" subtitle="Complaint management — coming in a later phase" />
  )
}
