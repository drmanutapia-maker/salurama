'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { ArrowLeft, Send, FileText, Paperclip, Image as ImageIcon, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import type { ConversacionResumen } from './ConversacionesLista'
import { EVENTO_CHAT_LEIDO } from '@/lib/chat/sinLeer'
import { PageErrorState, classifyError, type PageErrorType } from '@/components/PageErrorState'
import { Skeleton } from '@/components/Skeleton'

const TIPOS_MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
const TAMANO_MAXIMO_BYTES = 15728640 // 15 MB — mismo límite que el bucket chat-archivos
const POLL_INTERVAL_MS = 6000 // mismo intervalo que ChatPacienteClient.tsx, presupuesto chat_medico_poll:{salaId}

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

type CitaInfo = {
  id: string
  fecha: string
  hora: string
  motivo: string | null
  estado: 'pending_verification' | 'confirmed' | 'completed' | 'cancelled' | 'cancelada_paciente'
  completed_at: string | null
}

function formatFechaCorta(fechaStr: string) {
  const d = new Date(fechaStr + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Hora de envío de un mensaje/archivo (createdAt) — mismo formato corto que
// ChatPacienteClient.tsx ("10:32 am"), independiente de formatFechaCorta()
// que es para citas.fecha, no para un timestamp de envío.
function formatHoraEnvio(iso: string): string {
  const d = new Date(iso)
  const minutos = d.getMinutes().toString().padStart(2, '0')
  const sufijo = d.getHours() >= 12 ? 'pm' : 'am'
  const horas12 = d.getHours() % 12 || 12
  return `${horas12}:${minutos} ${sufijo}`
}

// Separador de fecha por día calendario real de envío — mismo patrón "Hoy /
// Ayer / fecha corta" que ChatPacienteClient.tsx. Reemplaza el agrupado
// anterior por citaId para la fecha (el motivo/estado de la cita se sigue
// mostrando aparte, ligado al cambio de cita, no al de día).
function formatSeparadorFecha(iso: string): string {
  const d = new Date(iso)
  const hoy = new Date()
  if (d.toDateString() === hoy.toDateString()) return 'Hoy'
  const ayer = new Date(Date.now() - 86400000)
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

const estadoLabels: Record<string, string> = {
  pending_verification: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  cancelada_paciente: 'Cancelada por el paciente',
}

export default function ConversacionChat({
  conversacion,
  onVolver,
  onError,
}: {
  conversacion: ConversacionResumen
  onVolver: () => void
  onError: (msg: string) => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [citasInfo, setCitasInfo] = useState<Map<string, CitaInfo>>(new Map())
  const [citaActualId, setCitaActualId] = useState(conversacion.citaActualId)
  // null = todavía no sabemos (fetch en camino); true/false = respuesta real
  // del servidor. Arrancar en false hacía que el banner "Conversación
  // cerrada" apareciera de entrada en CUALQUIER chat mientras cargaba, antes
  // de que /api/chat/medico/sesion confirmara el estado real.
  const [puedeEscribir, setPuedeEscribir] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PageErrorType | null>(null)
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [abriendoArchivoId, setAbriendoArchivoId] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const primeraCarga = useRef(true)

  const cargarConversacion = useCallback(async () => {
    if (primeraCarga.current) { setLoading(true); setError(null) }
    try {
      const res = await fetch('/api/chat/medico/sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaId: conversacion.salaId }),
      })
      if (!res.ok) {
        const err: any = new Error(`sesion_failed_${res.status}`)
        err.status = res.status
        throw err
      }

      const data = await res.json()
      const mensajes: Item[] = ((data.mensajes || []) as any[]).map(m => ({
        tipo: 'mensaje', id: m.id, citaId: m.cita_id, remitente: m.remitente_tipo, contenido: m.contenido, createdAt: m.created_at,
      }))
      const archivos: Item[] = ((data.archivos || []) as any[]).map(a => ({
        tipo: 'archivo', id: a.id, citaId: a.cita_id, remitente: a.remitente_tipo, nombreOriginal: a.nombre_original, tipoMime: a.tipo_mime, createdAt: a.created_at,
      }))
      const combinados = [...mensajes, ...archivos].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

      setItems(combinados)
      setCitasInfo(new Map(((data.citas || []) as CitaInfo[]).map(c => [c.id, c])))
      setCitaActualId(data.citaActualId)
      setPuedeEscribir(!!data.puedeEscribir)
      setError(null)

      // El backend ya marcó la sala como leída (medico_leido_at) — avisa a
      // los badges de la navegación para que se refresquen ahora mismo, en
      // vez de quedarse con el número viejo hasta su propio temporizador.
      window.dispatchEvent(new Event(EVENTO_CHAT_LEIDO))
    } catch (err) {
      console.error('Error cargando conversación:', err)
      // Solo la primera carga bloquea la vista con un error persistente —
      // antes, un fallo aquí dejaba `loading` en false igual y la pantalla
      // mostraba "Aún no hay mensajes" (falso: nunca llegó a saberlo) en vez
      // de un error real. Los refrescos de fondo (poll cada 6s) sí pueden
      // fallar en silencio sin romper la conversación ya cargada — solo
      // avisan con el toast existente.
      if (primeraCarga.current) setError(classifyError(err))
      else onError('No se pudo actualizar la conversación')
    } finally {
      setLoading(false)
      primeraCarga.current = false
    }
  }, [conversacion.salaId, onError])

  useEffect(() => {
    cargarConversacion()

    const interval = setInterval(() => {
      if (!document.hidden) cargarConversacion()
    }, POLL_INTERVAL_MS)

    const onVisible = () => {
      if (!document.hidden) cargarConversacion()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [cargarConversacion])

  // scrollIntoView() ajusta TODOS los ancestros scrollables, incluido el
  // documento (esta vista, a diferencia de MSLChat, vive dentro del flujo
  // normal de /dashboard/citas, no en un layout de viewport fijo) — eso
  // sacaba el scroll de la página en vez de solo el contenedor de mensajes.
  // Mover scrollTop directo en el contenedor evita tocar el scroll del documento.
  useEffect(() => {
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [items.length])

  const citaActual = citasInfo.get(citaActualId)

  const enviar = async () => {
    const contenido = input.trim()
    if (!contenido || enviando || !puedeEscribir) return
    setEnviando(true)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const res = await fetch('/api/chat/medico/mensaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaId: conversacion.salaId, contenido }),
      })
      if (!res.ok) throw new Error('No se pudo enviar el mensaje')
      const data = await res.json()
      setItems(prev => {
        if (prev.some(i => i.tipo === 'mensaje' && i.id === data.mensaje.id)) return prev
        return [...prev, { tipo: 'mensaje', id: data.mensaje.id, citaId: citaActualId, remitente: 'medico', contenido, createdAt: data.mensaje.created_at }]
      })
    } catch {
      onError('No se pudo enviar el mensaje')
      setInput(contenido)
    } finally {
      setEnviando(false)
    }
  }

  const handleAdjuntarClick = () => {
    if (subiendoArchivo || !puedeEscribir) return
    fileInputRef.current?.click()
  }

  const handleArchivoSeleccionado = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

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

      const form = new FormData()
      form.set('salaId', conversacion.salaId)
      form.set('archivo', archivoFinal, file.name)

      const res = await fetch('/api/chat/medico/archivo', { method: 'POST', body: form })
      if (!res.ok) throw new Error('No se pudo subir el archivo')
      const data = await res.json()

      setItems(prev => {
        if (prev.some(i => i.tipo === 'archivo' && i.id === data.archivo.id)) return prev
        return [...prev, { tipo: 'archivo', id: data.archivo.id, citaId: citaActualId, remitente: 'medico', nombreOriginal: file.name, tipoMime: file.type, createdAt: data.archivo.created_at }]
      })
    } catch (err) {
      console.error('Error al subir archivo:', err)
      setErrorArchivo('No se pudo subir el archivo. Intenta de nuevo.')
    } finally {
      setSubiendoArchivo(false)
    }
  }

  const abrirArchivo = async (item: Archivo) => {
    if (abriendoArchivoId) return
    setAbriendoArchivoId(item.id)
    try {
      const res = await fetch('/api/chat/medico/archivo-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaId: conversacion.salaId, archivoId: item.id }),
      })
      if (!res.ok) throw new Error('No se pudo obtener el archivo')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
    } catch (err) {
      console.error('Error al abrir archivo:', err)
      onError('No se pudo abrir el archivo')
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

  let ultimoDiaMostrado: string | null = null
  let ultimaCitaMostrada: string | null = null

  return (
    <div className="flex flex-col border border-neutral-200 rounded-2xl overflow-hidden bg-white" style={{ height: 'calc(100vh - 280px)', minHeight: 420 }}>
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-neutral-200">
        <button onClick={onVolver} aria-label="Volver a la lista de conversaciones" className="text-primary-500 shrink-0">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <p className="font-body font-semibold text-sm text-neutral-900 truncate">{conversacion.pacienteNombre}</p>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pt-4">
        {loading ? (
          <div role="status" aria-label="Cargando conversación" className="flex flex-col gap-3 pt-2">
            <div className="flex"><Skeleton width="42%" height={36} radius={16} /></div>
            <div className="flex justify-end"><Skeleton width="50%" height={36} radius={16} /></div>
            <div className="flex"><Skeleton width="33%" height={36} radius={16} /></div>
          </div>
        ) : error ? (
          <PageErrorState type={error} onRetry={cargarConversacion} compact />
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-neutral-500 pt-8">Aún no hay mensajes en esta conversación</p>
        ) : (
          items.map(item => {
            const diaItem = new Date(item.createdAt).toDateString()
            const mostrarSeparadorDia = diaItem !== ultimoDiaMostrado
            ultimoDiaMostrado = diaItem
            const mostrarInfoCita = item.citaId !== ultimaCitaMostrada
            ultimaCitaMostrada = item.citaId
            const cita = citasInfo.get(item.citaId)
            const isMedico = item.remitente === 'medico'

            return (
              <div key={`${item.tipo}-${item.id}`}>
                {mostrarSeparadorDia && (
                  <div className="flex items-center justify-center my-4">
                    <div className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs text-neutral-500 text-center">
                      {formatSeparadorFecha(item.createdAt)}
                    </div>
                  </div>
                )}
                {mostrarInfoCita && cita && (
                  <div className="flex items-center justify-center mb-3">
                    <div className="px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-500 text-center">
                      Cita del {formatFechaCorta(cita.fecha)} · {cita.hora?.slice(0, 5)}
                      {cita.motivo ? ` · ${cita.motivo}` : ''} · {estadoLabels[cita.estado]}
                    </div>
                  </div>
                )}
                <div className={`flex flex-col mb-3 ${isMedico ? 'items-end' : 'items-start'}`}>
                  {item.tipo === 'mensaje' ? (
                    <div
                      className={[
                        'max-w-[80%] rounded-2xl px-4 py-2.5 font-body text-sm leading-relaxed',
                        isMedico ? 'bg-primary-500 text-white rounded-tr-sm' : 'bg-neutral-100 text-neutral-700 rounded-tl-sm',
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
                        <Loader2 size={14} className="animate-spin shrink-0" aria-hidden="true" />
                      ) : item.tipoMime.startsWith('image/') ? (
                        <ImageIcon size={14} className="shrink-0" aria-hidden="true" />
                      ) : (
                        <FileText size={14} className="shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{item.nombreOriginal}</span>
                    </button>
                  )}
                  <span className="font-body text-[10px] text-neutral-500 mt-1 px-1">{formatHoraEnvio(item.createdAt)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {error ? null : puedeEscribir === null ? (
        <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-4 py-4 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-neutral-500" aria-hidden="true" />
          <p className="font-body text-xs text-neutral-500">Verificando disponibilidad...</p>
        </div>
      ) : puedeEscribir ? (
        <div className="shrink-0 border-t border-neutral-200 bg-white px-4 pt-3 pb-3">
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
              aria-label="Adjuntar imagen o PDF"
              className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border border-neutral-200 text-neutral-500 disabled:opacity-40 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
            >
              <Paperclip size={16} aria-hidden="true" />
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
              aria-label="Enviar mensaje"
              className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500 text-white disabled:opacity-40 hover:bg-primary-600 active:bg-primary-700 transition-colors"
            >
              <Send size={16} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t border-neutral-200 bg-amber-50 px-4 py-4">
          <p className="font-body text-sm font-semibold text-amber-800 mb-1">Conversación cerrada</p>
          <p className="font-body text-xs text-amber-700 leading-relaxed">
            {citaActual
              ? `La cita del ${formatFechaCorta(citaActual.fecha)} ya no admite mensajes nuevos.`
              : 'Esta conversación ya no admite mensajes nuevos.'}
          </p>
        </div>
      )}
    </div>
  )
}
