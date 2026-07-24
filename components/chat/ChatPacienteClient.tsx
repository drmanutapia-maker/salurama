'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import { Send, FileText } from 'lucide-react'

type Mensaje = {
  tipo: 'mensaje'
  id: string
  citaId: string
  remitente: 'medico' | 'paciente'
  contenido: string
  createdAt: string
}

type Archivo = {
  tipo: 'archivo'
  id: string
  citaId: string
  remitente: 'medico' | 'paciente'
  nombreOriginal: string
  createdAt: string
}

type Item = Mensaje | Archivo

type CitaInfo = { id: string; fecha: string; hora: string }

type SesionData = {
  citaActualId: string
  puedeEscribir: boolean
  items: Item[]
  medicoNombre: string | null
  medicoFotoUrl: string | null
  citaFecha: string | null
  citaHora: string | null
  citas: Map<string, CitaInfo>
}

type EstadoPagina = 'cargando' | 'error' | 'ok'
type TipoError = 'no_encontrado' | 'temporal'

// Mismo intervalo pensado contra el presupuesto de la clave chat_poll:{salaId}
// (180/15min en el endpoint): a 6s por ciclo son ~151 llamadas en 15 minutos,
// con margen para el fetch inicial y algún reintento.
const POLL_INTERVAL_MS = 6000

function formatFecha(fecha: string | null, hora: string | null): string {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  const fechaFmt = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  return hora ? `${fechaFmt} · ${hora.slice(0, 5)}` : fechaFmt
}

export default function ChatPacienteClient({ token }: { token: string }) {
  const [pagina, setPagina] = useState<EstadoPagina>('cargando')
  const [tipoError, setTipoError] = useState<TipoError>('temporal')
  const [sesion, setSesion] = useState<SesionData | null>(null)
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [avisoEnvio, setAvisoEnvio] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const primeraCarga = useRef(true)

  const cargarSesion = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/paciente/sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (res.status === 404) {
        setTipoError('no_encontrado')
        setPagina('error')
        return
      }
      if (!res.ok) {
        if (primeraCarga.current) {
          setTipoError('temporal')
          setPagina('error')
        }
        return
      }

      const data = await res.json()
      const mensajes: Item[] = (data.mensajes || []).map((m: any) => ({
        tipo: 'mensaje', id: m.id, citaId: m.cita_id, remitente: m.remitente_tipo, contenido: m.contenido, createdAt: m.created_at,
      }))
      const archivos: Item[] = (data.archivos || []).map((a: any) => ({
        tipo: 'archivo', id: a.id, citaId: a.cita_id, remitente: a.remitente_tipo, nombreOriginal: a.nombre_original, createdAt: a.created_at,
      }))
      const items = [...mensajes, ...archivos].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

      setSesion({
        citaActualId: data.citaActualId,
        puedeEscribir: data.puedeEscribir,
        items,
        medicoNombre: data.medicoNombre,
        medicoFotoUrl: data.medicoFotoUrl,
        citaFecha: data.citaFecha,
        citaHora: data.citaHora,
        citas: new Map((data.citas || []).map((c: CitaInfo) => [c.id, c])),
      })
      setPagina('ok')
    } catch {
      if (primeraCarga.current) {
        setTipoError('temporal')
        setPagina('error')
      }
    } finally {
      primeraCarga.current = false
    }
  }, [token])

  useEffect(() => {
    cargarSesion()

    const interval = setInterval(() => {
      if (!document.hidden) cargarSesion()
    }, POLL_INTERVAL_MS)

    const onVisible = () => {
      if (!document.hidden) cargarSesion()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [cargarSesion])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [sesion?.items.length])

  const enviar = async () => {
    const contenido = input.trim()
    if (!contenido || enviando || !sesion?.puedeEscribir) return
    setEnviando(true)
    setAvisoEnvio(null)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const res = await fetch('/api/chat/paciente/mensaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, contenido }),
      })

      if (!res.ok) {
        setAvisoEnvio('No se pudo enviar el mensaje. Intenta de nuevo.')
        setInput(contenido)
        return
      }

      const data = await res.json()
      setSesion(prev => prev ? {
        ...prev,
        items: [...prev.items, {
          tipo: 'mensaje', id: data.mensaje.id, citaId: prev.citaActualId, remitente: 'paciente', contenido, createdAt: data.mensaje.created_at,
        }],
      } : prev)
      cargarSesion()
    } catch {
      setAvisoEnvio('No se pudo enviar el mensaje. Intenta de nuevo.')
      setInput(contenido)
    } finally {
      setEnviando(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  const adjustTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }

  if (pagina === 'cargando') {
    return (
      <div className="flex items-center justify-center bg-neutral-50" style={{ height: '100svh' }}>
        <p className="font-body text-sm text-neutral-400">Cargando conversación...</p>
      </div>
    )
  }

  if (pagina === 'error') {
    return (
      <div className="flex items-center justify-center bg-neutral-50 px-6" style={{ height: '100svh' }}>
        <div className="max-w-sm text-center">
          <p className="font-body font-semibold text-base text-neutral-700 mb-2">
            {tipoError === 'no_encontrado' ? 'Este enlace ya no está disponible' : 'No pudimos cargar la conversación'}
          </p>
          <p className="font-body text-sm text-neutral-500 leading-relaxed">
            {tipoError === 'no_encontrado'
              ? 'Revisa que copiaste el enlace completo desde tu correo, o pide a tu médico que te lo reenvíe.'
              : 'Intenta de nuevo en unos momentos.'}
          </p>
        </div>
      </div>
    )
  }

  if (!sesion) return null

  let ultimaCitaMostrada: string | null = null

  return (
    <div className="flex flex-col bg-white" style={{ height: '100svh' }}>
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-neutral-200">
        {sesion.medicoFotoUrl ? (
          <img src={sesion.medicoFotoUrl} alt={sesion.medicoNombre || ''} className="w-9 h-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-500 flex items-center justify-center font-body font-semibold text-sm shrink-0">
            {(sesion.medicoNombre || '?')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-body font-semibold text-sm text-neutral-900 truncate">{sesion.medicoNombre || 'Tu médico'}</p>
          {(sesion.citaFecha) && (
            <p className="font-body text-xs text-neutral-500 truncate">{formatFecha(sesion.citaFecha, sesion.citaHora)}</p>
          )}
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pt-4">
        {sesion.items.length === 0 ? (
          <p className="text-center text-sm text-neutral-400 pt-8">Aún no hay mensajes en esta conversación</p>
        ) : (
          sesion.items.map(item => {
            const mostrarSeparador = item.citaId !== ultimaCitaMostrada
            ultimaCitaMostrada = item.citaId
            const isPaciente = item.remitente === 'paciente'
            const citaItem = sesion.citas.get(item.citaId)

            return (
              <div key={`${item.tipo}-${item.id}`}>
                {mostrarSeparador && (
                  <div className="flex items-center justify-center my-4">
                    <div className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs text-neutral-500 text-center">
                      {citaItem ? formatFecha(citaItem.fecha, citaItem.hora) : 'Conversación'}
                    </div>
                  </div>
                )}
                <div className={`flex mb-3 ${isPaciente ? 'justify-end' : 'justify-start'}`}>
                  {item.tipo === 'mensaje' ? (
                    <div
                      className={[
                        'max-w-[80%] rounded-2xl px-4 py-2.5 font-body text-sm leading-relaxed',
                        isPaciente ? 'bg-primary-500 text-white rounded-tr-sm' : 'bg-neutral-100 text-neutral-700 rounded-tl-sm',
                      ].join(' ')}
                    >
                      {item.contenido}
                    </div>
                  ) : (
                    <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-neutral-100 text-neutral-700 flex items-center gap-2 text-sm">
                      <FileText size={14} />
                      {item.nombreOriginal}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {sesion.puedeEscribir ? (
        <div className="shrink-0 border-t border-neutral-200 bg-white px-4 pt-3 pb-3">
          {avisoEnvio && <p className="font-body text-xs text-error-600 mb-2">{avisoEnvio}</p>}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); adjustTextarea() }}
              onKeyDown={handleKeyDown}
              disabled={enviando}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 font-body text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50 transition-colors"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            <button
              onClick={enviar}
              disabled={enviando || !input.trim()}
              className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500 text-white disabled:opacity-40 hover:bg-primary-600 active:bg-primary-700 transition-colors"
            >
              <Send size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t border-neutral-200 bg-amber-50 px-4 py-4">
          <p className="font-body text-sm font-semibold text-amber-800 mb-1">Conversación cerrada</p>
          <p className="font-body text-xs text-amber-700 leading-relaxed">
            {sesion.citaFecha
              ? `La cita del ${formatFecha(sesion.citaFecha, null)} ya no admite mensajes nuevos.`
              : 'Esta conversación ya no admite mensajes nuevos.'}
          </p>
        </div>
      )}
    </div>
  )
}
