'use client'

import { Suspense, useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import BackButton from '@/components/BackButton'

type Estado = 'idle' | 'enviando' | 'enviado' | 'limite' | 'error'
type Modo = 'email' | 'telefono'

export default function RecuperarChatClient() {
  const [modo, setModo] = useState<Modo>('email')
  const [valor, setValor] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [estado, setEstado] = useState<Estado>('idle')
  const [minutosEspera, setMinutosEspera] = useState(60)

  const cambiarModo = (nuevoModo: Modo) => {
    setModo(nuevoModo)
    setValor('')
  }

  const enviar = async () => {
    if (!valor.trim() || !turnstileToken || estado === 'enviando') return
    setEstado('enviando')

    try {
      const res = await fetch('/api/chat/reenviar-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [modo]: valor.trim(), turnstileToken }),
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
      <div className="flex items-center justify-center bg-neutral-50 px-6" style={{ minHeight: '100svh' }}>
        <div className="max-w-sm text-center">
          <p className="font-body font-semibold text-base text-neutral-700 mb-2">Listo</p>
          <p className="font-body text-sm text-neutral-500 leading-relaxed">
            Si esos datos tienen chats activos, te llegará un correo en unos minutos con el link. Revisa también spam.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center bg-neutral-50 px-6" style={{ minHeight: '100svh' }}>
      <div className="w-full max-w-sm py-10">
        <div className="mb-6">
          {/* BackButton usa useSearchParams() — Next.js exige un límite
              Suspense alrededor durante el prerenderizado estático, o el
              build falla con "useSearchParams() should be wrapped in a
              suspense boundary". */}
          <Suspense fallback={null}>
            <BackButton />
          </Suspense>
        </div>
        <h1 className="font-body font-semibold text-xl text-neutral-900 mb-2 text-center">
          ¿Perdiste el acceso a tu chat?
        </h1>
        <p className="font-body text-sm text-neutral-500 leading-relaxed text-center mb-6">
          Indica el correo o el teléfono con el que agendaste tu cita y te enviaremos el enlace a tu correo.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex rounded-xl bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => cambiarModo('email')}
              disabled={estado === 'enviando'}
              className={`flex-1 rounded-lg py-2 font-body text-sm font-semibold transition-colors disabled:opacity-50 ${
                modo === 'email' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Correo
            </button>
            <button
              type="button"
              onClick={() => cambiarModo('telefono')}
              disabled={estado === 'enviando'}
              className={`flex-1 rounded-lg py-2 font-body text-sm font-semibold transition-colors disabled:opacity-50 ${
                modo === 'telefono' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Teléfono
            </button>
          </div>

          <input
            type={modo === 'email' ? 'email' : 'tel'}
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder={modo === 'email' ? 'correo@ejemplo.com' : '55 1234 5678'}
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
            disabled={estado === 'enviando' || !valor.trim() || !turnstileToken}
            className="w-full flex items-center justify-center rounded-xl bg-primary-500 text-white font-body font-semibold text-sm py-3 disabled:opacity-40 hover:bg-primary-600 active:bg-primary-700 transition-colors"
          >
            {estado === 'enviando' ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
