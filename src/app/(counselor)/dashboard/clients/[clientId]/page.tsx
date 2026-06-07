type Props = {
  params: Promise<{ clientId: string }>
}

export default async function ClientRecordPage({ params }: Props) {
  await params

  return (
    <main className="flex-1 p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-text">Client record — coming soon</h1>
    </main>
  )
}
