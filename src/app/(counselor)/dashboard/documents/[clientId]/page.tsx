type Props = {
  params: Promise<{ clientId: string }>
}

export default async function CounselorDocumentsPage({ params }: Props) {
  const { clientId } = await params

  return (
    <main className="min-h-screen bg-brand-light p-6">
      <h1 className="text-2xl font-semibold text-brand-dark">Document Manager</h1>
      <p className="mt-2 text-brand-gray">Client: {clientId}</p>
    </main>
  )
}
