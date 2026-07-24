import type { Metadata } from 'next'
import ChatPacienteClient from '@/components/chat/ChatPacienteClient'

export const metadata: Metadata = {
  title: 'Chat con tu médico',
  robots: { index: false, follow: false },
}

export default async function ChatPacientePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <ChatPacienteClient token={token} />
}
