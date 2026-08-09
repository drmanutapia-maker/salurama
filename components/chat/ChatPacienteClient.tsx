'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import Link from 'next/link'
import { Send, FileText, Paperclip, Image as ImageIcon, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import AvisoNotificaciones from './AvisoNotificaciones'

const TIPOS_MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
const TAMANO_MAXIMO_BYTES = 15728640 // 15 MB — mismo límite que el bucket chat-archivos

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
  tipoMime: string
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
  citaEstado: string | null
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

// Hora de envío de un mensaje/archivo (createdAt, timestamp ISO) — formato
// corto tipo "10:32 am", independiente de formatFecha() que es para el par
// fecha/hora de una cita, no para un timestamp.
function formatHoraEnvio(iso: string): string {
  const d = new Date(iso)
  const minutos = d.getMinutes().toString().padStart(2, '0')
  const sufijo = d.getHours() >= 12 ? 'pm' : 'am'
  const horas12 = d.getHours() % 12 || 12
  return `${horas12}:${minutos} ${sufijo}`
}

// Separador de fecha por día calendario real de envío — mismo patrón "Hoy /
// Ayer / fecha corta" que ya usa ConversacionesLista.tsx para "última
// actividad". Reemplaza el agrupado anterior por citaId.
function formatSeparadorFecha(iso: string): string {
  const d = new Date(iso)
  const hoy = new Date()
  if (d.toDateString() === hoy.toDateString()) return 'Hoy'
  const ayer = new Date(Date.now() - 86400000)
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

export default function ChatPacienteClient({ token }: { token: string }) {
  const [pagina, setPagina] = useState<EstadoPagina>('cargando')
  const [tipoError, setTipoError] = useState<TipoError>('temporal')
  const [sesion, setSesion] = useState<SesionData | null>(null)
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [avisoEnvio, setAvisoEnvio] = useState<string | null>(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [abriendoArchivoId, setAbriendoArchivoId] = useState<string | null>(null)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [errorCancelar, setErrorCancelar] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
        tipo: 'archivo', id: a.id, citaId: a.cita_id, remitente: a.remitente_tipo, nombreOriginal: a.nombre_original, tipoMime: a.tipo_mime, createdAt: a.created_at,
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
        citaEstado: data.citaEstado,
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

  const cancelarCita = async () => {
    if (cancelando) return
    setCancelando(true)
    setErrorCancelar(null)
    try {
      const res = await fetch('/api/chat/paciente/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErrorCancelar(data?.error || 'No se pudo cancelar la cita. Intenta de nuevo.')
        return
      }
      setConfirmandoCancelar(false)
      await cargarSesion()
    } catch {
      setErrorCancelar('No se pudo cancelar la cita. Intenta de nuevo.')
    } finally {
      setCancelando(false)
    }
  }

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

  const handleAdjuntarClick = () => {
    if (subiendoArchivo || !sesion?.puedeEscribir) return
    fileInputRef.current?.click()
  }

  const handleArchivoSeleccionado = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file || !sesion?.puedeEscribir) return

    setErrorArchivo(null)

    if (!(TIPOS_MIME_PERMITIDOS as readonly string[]).includes(file.type)) {
      setErrorArchivo('Solo se permiten imágenes (JPG, PNG, WEBP) o PDF')
      return
    }
    if (file.size > TAMANO_MAXIMO_BYTES) {
      setErrorArchivo('El archivo no puede pesar más de 15 MB')
      return
    }

    setSubiendoArchivo(true)

    try {
      const archivoFinal = file.type.startsWith('image/')
        ? await imageCompression(file, { maxSizeMB: 3, maxWidthOrHeight: 2000, useWebWorker: true })
        : file

      const formData = new FormData()
      formData.append('token', token)
      formData.append('archivo', archivoFinal, file.name)

      const res = await fetch('/api/chat/paciente/archivo', { method: 'POST', body: formData })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrorArchivo(data?.error || 'No se pudo subir el archivo. Intenta de nuevo.')
        return
      }

      const data = await res.json()
      setSesion(prev => prev ? {
        ...prev,
        items: [...prev.items, {
          tipo: 'archivo', id: data.archivo.id, citaId: prev.citaActualId, remitente: 'paciente', nombreOriginal: file.name, tipoMime: file.type, createdAt: data.archivo.created_at,
        }],
      } : prev)
      cargarSesion()
    } catch {
      setErrorArchivo('No se pudo subir el archivo. Intenta de nuevo.')
    } finally {
      setSubiendoArchivo(false)
    }
  }

  const abrirArchivo = async (item: Archivo) => {
    if (abriendoArchivoId) return
    setAbriendoArchivoId(item.id)
    try {
      const res = await fetch('/api/chat/paciente/archivo-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, archivoId: item.id }),
      })
      if (!res.ok) throw new Error('No se pudo obtener el archivo')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, '_blank', 'noopener,noreferrer')
      // Revocar después de darle tiempo a la pestaña nueva de cargarlo —
      // no se puede revocar de inmediato porque la carga es asíncrona.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
    } catch {
      setErrorArchivo('No se pudo abrir el archivo. Intenta de nuevo.')
    } finally {
      setAbriendoArchivoId(null)
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
              ? 'Puede haber expirado o haberse copiado incompleto. Recupera el acceso a tu chat con tu correo.'
              : 'Intenta de nuevo en unos momentos.'}
          </p>
          {tipoError === 'no_encontrado' && (
            <Link
              href="/chat/recuperar"
              className="inline-block mt-3 font-body text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors"
            >
              Recuperar mi acceso
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (!sesion) return null

  let ultimoDiaMostrado: string | null = null

  // Momento de ofrecer notificaciones: justo después del primer mensaje del
  // médico, o al confirmarse la cita — lo que ocurra primero. Nunca en una
  // conversación ya cerrada.
  const hayMensajeMedico = sesion.items.some(item => item.tipo === 'mensaje' && item.remitente === 'medico')
  const citaConfirmadaOMas = sesion.citaEstado === 'confirmed' || sesion.citaEstado === 'completed'
  const ofrecerNotificaciones = sesion.puedeEscribir && (hayMensajeMedico || citaConfirmadaOMas)

  // El botón "Cancelar cita" no debe ofrecerse para una cita que ya ocurrió
  // — el servidor de todos modos lo rechaza (menos de 24h para la consulta),
  // pero mostrarlo igual invita a un clic que solo termina en un error.
  const citaEsFutura = !!(sesion.citaFecha && sesion.citaHora && new Date(`${sesion.citaFecha}T${sesion.citaHora}`) > new Date())

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
            <p className="font-body text-xs text-neutral-500 truncate">Próxima cita: {formatFecha(sesion.citaFecha, sesion.citaHora)}</p>
          )}
        </div>
        {(sesion.citaEstado === 'pending_verification' || sesion.citaEstado === 'confirmed') && citaEsFutura && !confirmandoCancelar && (
          <button
            onClick={() => { setConfirmandoCancelar(true); setErrorCancelar(null) }}
            className="shrink-0 font-body text-xs font-semibold text-error-600 hover:text-error-700 transition-colors"
          >
            Cancelar cita
          </button>
        )}
        {sesion.citaEstado === 'cancelada_paciente' && (
          <p className="shrink-0 font-body text-xs text-neutral-400">Cancelaste esta cita</p>
        )}
      </div>

      <AvisoNotificaciones token={token} activo={ofrecerNotificaciones} />

      {confirmandoCancelar && (
        <div className="shrink-0 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="font-body text-sm text-neutral-700 mb-2">¿Seguro que quieres cancelar tu cita?</p>
          {errorCancelar && (
            <p className="font-body text-xs text-error-600 mb-2">{errorCancelar}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={cancelarCita}
              disabled={cancelando}
              className="font-body text-xs font-semibold text-white bg-error-600 hover:bg-error-700 disabled:opacity-50 rounded-lg px-3 py-2 transition-colors"
            >
              {cancelando ? 'Cancelando...' : 'Sí, cancelar cita'}
            </button>
            <button
              onClick={() => { setConfirmandoCancelar(false); setErrorCancelar(null) }}
              disabled={cancelando}
              className="font-body text-xs font-semibold text-neutral-600 hover:text-neutral-800 disabled:opacity-50 rounded-lg px-3 py-2 transition-colors"
            >
              No, mantener cita
            </button>
          </div>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pt-4">
        {sesion.items.length === 0 ? (
          <p className="text-center text-sm text-neutral-400 pt-8">Aún no hay mensajes en esta conversación</p>
        ) : (
          sesion.items.map(item => {
            const diaItem = new Date(item.createdAt).toDateString()
            const mostrarSeparador = diaItem !== ultimoDiaMostrado
            ultimoDiaMostrado = diaItem
            const isPaciente = item.remitente === 'paciente'

            return (
              <div key={`${item.tipo}-${item.id}`}>
                {mostrarSeparador && (
                  <div className="flex items-center justify-center my-4">
                    <div className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs text-neutral-500 text-center">
                      {formatSeparadorFecha(item.createdAt)}
                    </div>
                  </div>
                )}
                <div className={`flex flex-col mb-3 ${isPaciente ? 'items-end' : 'items-start'}`}>
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
                    <button
                      onClick={() => abrirArchivo(item)}
                      disabled={abriendoArchivoId === item.id}
                      className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-neutral-100 text-neutral-700 flex items-center gap-2 text-sm hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-60 transition-colors text-left"
                    >
                      {abriendoArchivoId === item.id ? (
                        <Loader2 size={14} className="animate-spin shrink-0" />
                      ) : item.tipoMime.startsWith('image/') ? (
                        <ImageIcon size={14} className="shrink-0" />
                      ) : (
                        <FileText size={14} className="shrink-0" />
                      )}
                      <span className="truncate">{item.nombreOriginal}</span>
                    </button>
                  )}
                  <span className="font-body text-[10px] text-neutral-400 mt-1 px-1">{formatHoraEnvio(item.createdAt)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {sesion.puedeEscribir ? (
        <div className="shrink-0 border-t border-neutral-200 bg-white px-4 pt-3 pb-3">
          <p className="font-body text-xs text-neutral-400 mb-2">
            Chatea con tu médico — disponible hasta 72 horas después de que se marque tu consulta como atendida.
          </p>
          {avisoEnvio && <p className="font-body text-xs text-error-600 mb-2">{avisoEnvio}</p>}
          {errorArchivo && <p className="font-body text-xs text-error-600 mb-2">{errorArchivo}</p>}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={TIPOS_MIME_PERMITIDOS.join(',')}
              className="hidden"
              onChange={handleArchivoSeleccionado}
            />
            <button
              onClick={handleAdjuntarClick}
              disabled={subiendoArchivo}
              title="Adjuntar imagen o PDF"
              className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border border-neutral-200 text-neutral-500 disabled:opacity-40 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
            >
              <Paperclip size={16} />
            </button>
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
