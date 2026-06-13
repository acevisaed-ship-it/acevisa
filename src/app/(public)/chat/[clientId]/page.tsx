import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ clientId: string }>
}

// Old bare-chat URL — redirect to the full client portal
export default async function ChatRedirectPage({ params }: Props) {
  const { clientId } = await params
  redirect(`/portal?clientId=${clientId}`)
}
