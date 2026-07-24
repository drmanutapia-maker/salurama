'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'

type Estado = 'idle' | 'enviando' | 'enviado' | 'limite' | 'error'

export default function RecuperarChatClient() {
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [estado, setEstado] = useState<Estado>('idle')
  const [minutosEspera, setMinutosEspera] = useState(60)

  const enviar = async () => {
    if (!email.trim() || !turnstileToken || estado === 'enviando') return
    setEstado('enviando')

    try {
      const res = await fetch('/api/chat/reenviar-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), turnstileToken }),
      })

      if (res.status === 429) {
        const retryAfterSeg = Number(res.headers.get('Retry-After')) || 3600
        setMinutosEspera(Math.ceil(retryAfterSeg / 60))
        setEstado('limite')
        return
      }

      if (!res.ok) {
        setEstado('error')
        return
      }

      setEstado('enviado')
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'enviado') {
    return (
      <div className="flex items-center justify-center bg-neutral-50 px-6" style={{ height: '100svh' }}>
        <div className="max-w-sm text-center">
          <p className="font-body font-semibold text-base text-neutral-700 mb-2">Listo</p>
          <p className="font-body text-sm text-neutral-500 leading-relaxed">
            Si ese correo tiene chats activos, te llegará un correo en unos minutos con el link. Revisa también spam.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center bg-neutral-50 px-6" style={{ minHeight: '100svh' }}>
      <div className="w-full max-w-sm py-10">
        <h1 className="font-body font-semibold text-xl text-neutral-900 mb-2 text-center">
          ¿Perdiste el acceso a tu chat?
        </h1>
        <p className="font-body text-sm text-neutral-500 leading-relaxed text-center mb-6">
          Escribe el correo con el que agendaste tu cita y te reenviamos el link.
        </p>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            disabled={estado === 'enviando'}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 font-body text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 transition-colors"
          />

          <div className="flex justify-center">
            <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} onSuccess={setTurnstileToken} options={{ theme: 'light' }} />
          </div>

          {estado === 'limite' && (
            <p className="font-body text-xs text-error-600 text-center">
              Hiciste demasiados intentos. Intenta de nuevo en {minutosEspera} minutos.
            </p>
          )}

          {estado === 'error' && (
            <p className="font-body text-xs text-error-600 text-center">
              No pudimos procesar tu solicitud. Intenta de nuevo.
            </p>
          )}

          <button
            onClick={enviar}
            disabled={estado === 'enviando' || !email.trim() || !turnstileToken}
            className="w-full flex items-center justify-center rounded-xl bg-primary-500 text-white font-body font-semibold text-sm py-3 disabled:opacity-40 hover:bg-primary-600 active:bg-primary-700 transition-colors"
          >
            {estado === 'enviando' ? 'Enviando...' : 'Enviar'}
          </button>

          <Link href="/" className="font-body text-xs text-neutral-400 text-center hover:text-neutral-600 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
