'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type ConversacionResumen = {
  salaId: string
  pacienteId: string
  citaActualId: string
  pacienteNombre: string
  motivo: string | null
  fecha: string
  hora: string
  estado: 'pending_verification' | 'confirmed' | 'completed' | 'cancelled'
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

  useEffect(() => {
    let activo = true
    async function cargar() {
      const { data: salas } = await supabase
        .from('chat_salas')
        .select('id, paciente_id, cita_actual_id, created_at')
        .eq('medico_id', medicoId)

      if (!salas || salas.length === 0) {
        if (activo) { setConversaciones([]); setLoading(false) }
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

      const citasPorId = new Map((citasRes.data || []).map((c: any) => [c.id, c]))
      const ultimoMedicoPorSala = new Map<string, string>()
      const ultimaActividadPorSala = new Map<string, string>()
      const mensajesPorSala = new Map<string, { remitente_tipo: string; created_at: string }[]>()

      for (const m of (mensajesRes.data || []) as { sala_id: string; remitente_tipo: string; created_at: string }[]) {
        ultimaActividadPorSala.set(m.sala_id, m.created_at)
        if (m.remitente_tipo === 'medico') ultimoMedicoPorSala.set(m.sala_id, m.created_at)
        const arr = mensajesPorSala.get(m.sala_id) || []
        arr.push(m)
        mensajesPorSala.set(m.sala_id, arr)
      }

      const lista: ConversacionResumen[] = salas.map((s: any) => {
        const cita = citasPorId.get(s.cita_actual_id)
        // Heurística de "no leído" (aprobada, sin migración ni columna nueva):
        // mensajes del paciente posteriores al último mensaje del médico en
        // esa sala, o desde que se creó la sala si el médico nunca escribió.
        const umbral = ultimoMedicoPorSala.get(s.id) || s.created_at
        const mensajesSala = mensajesPorSala.get(s.id) || []
        const sinLeer = mensajesSala.filter(m => m.remitente_tipo === 'paciente' && m.created_at > umbral).length

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

      if (activo) { setConversaciones(lista); setLoading(false) }
    }
    cargar()
    return () => { activo = false }
  }, [medicoId])

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '40px 0' }}>Cargando conversaciones...</p>
  }

  if (conversaciones.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, padding: '60px 20px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: '#374151', fontWeight: 700, marginBottom: 8 }}>Sin conversaciones</p>
        <p style={{ fontSize: 14, color: '#9CA3AF' }}>Cuando confirmes tu primera cita con un paciente, la conversación aparecerá aquí</p>
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
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1E3A5F,#2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
            {c.pacienteNombre.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.pacienteNombre}
            </p>
            {c.motivo && (
              <p style={{ fontSize: 13, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.motivo}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{formatUltimaActividad(c.ultimaActividad)}</span>
            {c.sinLeer > 0 && (
              <span style={{ background: '#DC2626', color: '#fff', borderRadius: 99, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, padding: '0 6px' }}>
                {c.sinLeer}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
