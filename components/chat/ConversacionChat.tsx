'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { ArrowLeft, Send, FileText, Paperclip, Image as ImageIcon, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabaseClient'
import type { ConversacionResumen } from './ConversacionesLista'

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
  storagePath: string
  tipoMime: string
  createdAt: string
}

type Item = Mensaje | Archivo

type CitaInfo = {
  id: string
  fecha: string
  hora: string
  motivo: string | null
  estado: 'pending_verification' | 'confirmed' | 'completed' | 'cancelled'
  completed_at: string | null
}

// Mismo criterio que la función SQL sesion_cerrada(): cancelada, o completada
// hace más de 72h. Una cita completada sin completed_at (anterior al Paso 1,
// nunca corrió ese trigger) se trata como cerrada, no como escribible.
function sesionCerrada(cita: CitaInfo | undefined): boolean {
  if (!cita) return true
  if (cita.estado === 'cancelled') return true
  if (cita.estado === 'completed') {
    if (!cita.completed_at) return true
    return Date.now() - new Date(cita.completed_at).getTime() > 72 * 60 * 60 * 1000
  }
  return false
}

function formatFechaCorta(fechaStr: string) {
  const d = new Date(fechaStr + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

const estadoLabels: Record<string, string> = {
  pending_verification: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export default function ConversacionChat({
  medicoId,
  conversacion,
  onVolver,
  onError,
}: {
  medicoId: string
  conversacion: ConversacionResumen
  onVolver: () => void
  onError: (msg: string) => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [citasInfo, setCitasInfo] = useState<Map<string, CitaInfo>>(new Map())
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [abriendoArchivoId, setAbriendoArchivoId] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let activo = true
    async function cargar() {
      const [mensajesRes, archivosRes] = await Promise.all([
        supabase
          .from('chat_mensajes')
          .select('id, cita_id, remitente_tipo, contenido, created_at')
          .eq('sala_id', conversacion.salaId)
          .order('created_at', { ascending: true }),
        supabase
          .from('chat_archivos')
          .select('id, cita_id, remitente_tipo, nombre_original, storage_path, tipo_mime, created_at')
          .eq('sala_id', conversacion.salaId)
          .order('created_at', { ascending: true }),
      ])

      const mensajes: Item[] = ((mensajesRes.data || []) as any[]).map(m => ({
        tipo: 'mensaje', id: m.id, citaId: m.cita_id, remitente: m.remitente_tipo, contenido: m.contenido, createdAt: m.created_at,
      }))
      const archivos: Item[] = ((archivosRes.data || []) as any[]).map(a => ({
        tipo: 'archivo', id: a.id, citaId: a.cita_id, remitente: a.remitente_tipo, nombreOriginal: a.nombre_original, storagePath: a.storage_path, tipoMime: a.tipo_mime, createdAt: a.created_at,
      }))
      const combinados = [...mensajes, ...archivos].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

      const citaIds = Array.from(new Set([conversacion.citaActualId, ...combinados.map(i => i.citaId)]))
      const { data: citas } = await supabase
        .from('citas')
        .select('id, fecha, hora, motivo, estado, completed_at')
        .in('id', citaIds)

      if (!activo) return
      setItems(combinados)
      setCitasInfo(new Map(((citas || []) as CitaInfo[]).map(c => [c.id, c])))
      setLoading(false)
    }
    cargar()
    return () => { activo = false }
  }, [conversacion.salaId, conversacion.citaActualId])

  useEffect(() => {
    const channel = supabase
      .channel(`chat_mensajes_sala_${conversacion.salaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_mensajes', filter: `sala_id=eq.${conversacion.salaId}` },
        (payload: any) => {
          const row = payload.new as { id: string; cita_id: string; remitente_tipo: 'medico' | 'paciente'; contenido: string; created_at: string }
          setItems(prev => {
            if (prev.some(i => i.tipo === 'mensaje' && i.id === row.id)) return prev
            return [...prev, { tipo: 'mensaje', id: row.id, citaId: row.cita_id, remitente: row.remitente_tipo, contenido: row.contenido, createdAt: row.created_at } as Item]
              .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_archivos', filter: `sala_id=eq.${conversacion.salaId}` },
        (payload: any) => {
          const row = payload.new as { id: string; cita_id: string; remitente_tipo: 'medico' | 'paciente'; nombre_original: string; storage_path: string; tipo_mime: string; created_at: string }
          setItems(prev => {
            if (prev.some(i => i.tipo === 'archivo' && i.id === row.id)) return prev
            return [...prev, { tipo: 'archivo', id: row.id, citaId: row.cita_id, remitente: row.remitente_tipo, nombreOriginal: row.nombre_original, storagePath: row.storage_path, tipoMime: row.tipo_mime, createdAt: row.created_at } as Item]
              .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversacion.salaId])

  // scrollIntoView() ajusta TODOS los ancestros scrollables, incluido el
  // documento (esta vista, a diferencia de MSLChat, vive dentro del flujo
  // normal de /dashboard/citas, no en un layout de viewport fijo) — eso
  // sacaba el scroll de la página en vez de solo el contenedor de mensajes.
  // Mover scrollTop directo en el contenedor evita tocar el scroll del documento.
  useEffect(() => {
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [items.length])

  const citaActual = citasInfo.get(conversacion.citaActualId)
  const puedeEscribir = !sesionCerrada(citaActual)

  const enviar = async () => {
    const contenido = input.trim()
    if (!contenido || enviando || !puedeEscribir) return
    setEnviando(true)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const { data, error } = await supabase
      .from('chat_mensajes')
      .insert({
        sala_id: conversacion.salaId,
        cita_id: conversacion.citaActualId,
        remitente_tipo: 'medico',
        medico_id: medicoId,
        contenido,
      })
      .select('id, created_at')
      .single()

    setEnviando(false)
    if (error || !data) {
      onError('No se pudo enviar el mensaje')
      setInput(contenido)
      return
    }
    setItems(prev => {
      if (prev.some(i => i.tipo === 'mensaje' && i.id === data.id)) return prev
      return [...prev, { tipo: 'mensaje', id: data.id, citaId: conversacion.citaActualId, remitente: 'medico', contenido, createdAt: data.created_at }]
    })
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
    let rutaSubida: string | null = null

    try {
      const archivoFinal = file.type.startsWith('image/')
        ? await imageCompression(file, { maxSizeMB: 3, maxWidthOrHeight: 2000, useWebWorker: true })
        : file

      const archivoId = crypto.randomUUID()
      const ext = file.name.split('.').pop() || 'bin'
      const path = `${conversacion.salaId}/${archivoId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('chat-archivos')
        .upload(path, archivoFinal, { contentType: file.type })
      if (uploadError) throw uploadError
      rutaSubida = path

      const { data, error } = await supabase
        .from('chat_archivos')
        .insert({
          id: archivoId,
          sala_id: conversacion.salaId,
          cita_id: conversacion.citaActualId,
          remitente_tipo: 'medico',
          medico_id: medicoId,
          storage_path: path,
          nombre_original: file.name,
          tipo_mime: file.type,
          tamano_bytes: archivoFinal.size,
        })
        .select('id, created_at')
        .single()

      if (error || !data) throw error || new Error('insert falló sin error explícito')

      setItems(prev => {
        if (prev.some(i => i.tipo === 'archivo' && i.id === data.id)) return prev
        return [...prev, { tipo: 'archivo', id: data.id, citaId: conversacion.citaActualId, remitente: 'medico', nombreOriginal: file.name, storagePath: path, tipoMime: file.type, createdAt: data.created_at }]
      })
    } catch (err) {
      console.error('Error al subir archivo:', err)
      // El archivo ya se subió a Storage pero el registro en chat_archivos
      // falló — borrarlo para no dejarlo huérfano sin fila que lo referencie.
      if (rutaSubida) {
        await supabase.storage.from('chat-archivos').remove([rutaSubida]).catch(() => {})
      }
      setErrorArchivo('No se pudo subir el archivo. Intenta de nuevo.')
    } finally {
      setSubiendoArchivo(false)
    }
  }

  const abrirArchivo = async (item: Archivo) => {
    if (abriendoArchivoId) return
    setAbriendoArchivoId(item.id)
    try {
      const { data, error } = await supabase.storage
        .from('chat-archivos')
        .createSignedUrl(item.storagePath, 300)
      if (error || !data) throw error || new Error('sin URL firmada')
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
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

  let ultimaCitaMostrada: string | null = null

  return (
    <div className="flex flex-col border border-neutral-200 rounded-2xl overflow-hidden bg-white" style={{ height: 'calc(100vh - 280px)', minHeight: 420 }}>
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-neutral-200">
        <button onClick={onVolver} className="text-primary-500 shrink-0">
          <ArrowLeft size={18} />
        </button>
        <p className="font-body font-semibold text-sm text-neutral-900 truncate">{conversacion.pacienteNombre}</p>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pt-4">
        {loading ? (
          <p className="text-center text-sm text-neutral-400 pt-8">Cargando conversación...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-neutral-400 pt-8">Aún no hay mensajes en esta conversación</p>
        ) : (
          items.map(item => {
            const mostrarSeparador = item.citaId !== ultimaCitaMostrada
            ultimaCitaMostrada = item.citaId
            const cita = citasInfo.get(item.citaId)
            const isMedico = item.remitente === 'medico'

            return (
              <div key={`${item.tipo}-${item.id}`}>
                {mostrarSeparador && cita && (
                  <div className="flex items-center justify-center my-4">
                    <div className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs text-neutral-500 text-center">
                      {formatFechaCorta(cita.fecha)} · {cita.hora?.slice(0, 5)}
                      {cita.motivo ? ` · ${cita.motivo}` : ''} · {estadoLabels[cita.estado]}
                    </div>
                  </div>
                )}
                <div className={`flex mb-3 ${isMedico ? 'justify-end' : 'justify-start'}`}>
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
                        <Loader2 size={14} className="animate-spin shrink-0" />
                      ) : item.tipoMime.startsWith('image/') ? (
                        <ImageIcon size={14} className="shrink-0" />
                      ) : (
                        <FileText size={14} className="shrink-0" />
                      )}
                      <span className="truncate">{item.nombreOriginal}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {puedeEscribir ? (
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
            {citaActual
              ? `La cita del ${formatFechaCorta(citaActual.fecha)} ya no admite mensajes nuevos.`
              : 'Esta conversación ya no admite mensajes nuevos.'}
          </p>
        </div>
      )}
    </div>
  )
}
