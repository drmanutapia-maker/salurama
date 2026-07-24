import type { Metadata } from 'next'
import RecuperarChatClient from '@/components/chat/RecuperarChatClient'

export const metadata: Metadata = {
  title: 'Recuperar acceso a tu chat',
  robots: { index: false, follow: false },
}

export default function RecuperarChatPage() {
  return <RecuperarChatClient />
}
