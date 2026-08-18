'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { sinLeerPorSala } from '@/lib/chat/sinLeer'
import { Skeleton } from '@/components/Skeleton'
import { PageErrorState, classifyError, type PageErrorType } from '@/components/PageErrorState'

export type ConversacionResumen = {
  salaId: string
  pacienteId: string
  citaActualId: string
  pacienteNombre: string
  motivo: string | null
  fecha: string
  hora: string
  estado: 'pending_verification' | 'confirmed' | 'completed' | 'cancelled' | 'cancelada_paciente'
  ultimaActividad: string
  sinLeer: number
}

function formatUltimaActividad(iso: string) {
  const d = new Date(iso)
  const hoy = new Date()
  if (d.toDateString() === hoy.toDateString()) {
    return d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
  }
  const ayer = new Date(Date.now() - 86400000)
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export default function ConversacionesLista({
  medicoId,
  onSeleccionar,
}: {
  medicoId: string
  onSeleccionar: (c: ConversacionResumen) => void
}) {
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PageErrorType | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: salas, error: salasErr } = await supabase
        .from('chat_salas')
        .select('id, paciente_id, cita_actual_id, created_at, medico_leido_at')
        .eq('medico_id', medicoId)
      if (salasErr) throw salasErr

      if (!salas || salas.length === 0) {
        setConversaciones([])
        setLoading(false)
        return
      }

      const citaIds = salas.map(s => s.cita_actual_id)
      const salaIds = salas.map(s => s.id)

      const [citasRes, mensajesRes] = await Promise.all([
        supabase.from('citas').select('id, paciente_nombre, motivo, fecha, hora, estado').in('id', citaIds),
        supabase
          .from('chat_mensajes')
          .select('sala_id, remitente_tipo, created_at')
          .in('sala_id', salaIds)
          .order('created_at', { ascending: true }),
      ])
      if (citasRes.error) throw citasRes.error
      if (mensajesRes.error) throw mensajesRes.error

      const citasPorId = new Map((citasRes.data || []).map((c: any) => [c.id, c]))
      const ultimaActividadPorSala = new Map<string, string>()
      const mensajes = (mensajesRes.data || []) as { sala_id: string; remitente_tipo: string; created_at: string }[]

      for (const m of mensajes) {
        ultimaActividadPorSala.set(m.sala_id, m.created_at)
      }

      const sinLeerPorSalaMap = sinLeerPorSala(salas, mensajes)

      const lista: ConversacionResumen[] = salas.map((s: any) => {
        const cita = citasPorId.get(s.cita_actual_id)
        const sinLeer = sinLeerPorSalaMap.get(s.id) || 0

        return {
          salaId: s.id,
          pacienteId: s.paciente_id,
          citaActualId: s.cita_actual_id,
          pacienteNombre: cita?.paciente_nombre || 'Paciente',
          motivo: cita?.motivo ?? null,
          fecha: cita?.fecha || '',
          hora: cita?.hora || '',
          estado: (cita?.estado as ConversacionResumen['estado']) || 'confirmed',
          ultimaActividad: ultimaActividadPorSala.get(s.id) || s.created_at,
          sinLeer,
        }
      })

      lista.sort((a, b) => (a.ultimaActividad < b.ultimaActividad ? 1 : -1))

      setConversaciones(lista)
      setLoading(false)
    } catch (err) {
      setError(classifyError(err))
      setLoading(false)
    }
  }, [medicoId])

  useEffect(() => {
    let activo = true
    if (activo) cargar()
    return () => { activo = false }
  }, [cargar])

  if (loading) {
    return <ConversacionesListaSkeleton />
  }

  if (error) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
        <PageErrorState type={error} onRetry={cargar} compact />
      </div>
    )
  }

  if (conversaciones.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, padding: '60px 20px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: '#374151', fontWeight: 700, marginBottom: 8 }}>Sin conversaciones</p>
        <p style={{ fontSize: 14, color: '#6B7280' }}>Cuando confirmes tu primera cita con un paciente, la conversación aparecerá aquí</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {conversaciones.map(c => (
        <button
          key={c.salaId}
          onClick={() => onSeleccionar(c)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, background: '#fff',
            borderRadius: 14, border: '1.5px solid #E5E7EB', padding: '14px 16px',
            textAlign: 'left', cursor: 'pointer', width: '100%', fontFamily: 'inherit',
          }}
        >
          <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1E3A5F,#2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
            {c.pacienteNombre.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.pacienteNombre}
            </p>
            {c.motivo && (
              <p style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.motivo}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{formatUltimaActividad(c.ultimaActividad)}</span>
            {c.sinLeer > 0 && (
              <span
                aria-label={`${c.sinLeer} mensaje${c.sinLeer === 1 ? '' : 's'} sin leer`}
                style={{ background: '#DC2626', color: '#fff', borderRadius: 99, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, padding: '0 6px' }}
              >
                {c.sinLeer}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

function ConversacionesListaSkeleton() {
  return (
    <div role="status" aria-label="Cargando conversaciones" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: '14px 16px' }}>
          <Skeleton width={44} height={44} radius={999} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="40%" height={15} />
            <Skeleton width="60%" height={13} />
          </div>
          <Skeleton width={30} height={12} />
        </div>
      ))}
    </div>
  )
}
