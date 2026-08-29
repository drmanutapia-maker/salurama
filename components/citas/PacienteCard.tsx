import { useState } from 'react'
import { MessageCircle, History, CheckCircle, XCircle, Check, Clock, Link2, Undo2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Cita } from '@/lib/citas/types'
import { formatFecha } from '@/lib/citas/fechas'

export const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending_verification: { bg: '#FEF3C7', text: '#92400E', label: 'Pendiente' },
  confirmed: { bg: '#DCFCE7', text: '#059669', label: 'Confirmada' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelada' },
  completed: { bg: '#E0E7FF', text: '#3730A3', label: 'Completada' },
  cancelada_paciente: { bg: '#FFEDD5', text: '#C2410C', label: 'Cancelada por el paciente' },
}

const esCancelada = (c: Cita) => c.estado === 'cancelled' || c.estado === 'cancelada_paciente'

// Fecha+hora combinadas en un timestamp real -- a diferencia de isFutura()
// (que solo compara la fecha a medianoche y por eso trata "hoy" siempre
// como no-futuro), esto sí distingue si una cita de hoy más tarde todavía
// no pasa, que es lo que importa para decidir cuál es la "próxima cita".
// Exportada -- también la usa page.tsx para calcular el estado del chat
// sobre el grupo COMPLETO de citas (sin filtrar por el tab activo).
export function datetimeCita(c: Cita): number {
  return new Date(`${c.fecha}T${c.hora || '00:00'}`).getTime()
}

const HORAS_VENTANA_CHAT = 72

// true si el canal de chat de este paciente sigue "activo" (botón normal),
// false si ya toca mostrarlo como solo-lectura o sin canal ("Ver historial
// de chat"). Se evalúa sobre TODAS las citas del paciente, no solo las del
// tab activo -- es un hecho real sobre el canal, no debería cambiar según
// qué filtro tenga abierto el médico. Reglas (ver conversación con Manuel):
//   1. Cita futura con estado 'confirmed' -> activo, sin importar lo demás.
//   2. Si no, decide la cita más reciente por fecha de creación (mismo
//      criterio que usa el backend para chat_salas.cita_actual_id -- ver
//      trigger actualizar_chat_sala_cita, migración 20260724000001):
//        - cancelada -> NUNCA activo. Antes esto se colaba al valor por
//          omisión (activo) porque el código solo miraba citas
//          'completed' e ignoraba que "no hay completadas" también incluye
//          "todas canceladas" -- una tarjeta con una única cita cancelada
//          (incluso de antes de que existiera el chat) mostraba "Chatear
//          con paciente" como si el canal siguiera abierto. Corregido.
//        - completada -> activo si se marcó hace menos de 72h. completed_at
//          es lo preciso; si faltara (citas de antes del Paso 1, sin
//          backfill) se usa fecha+hora de la cita como aproximación.
//        - cualquier otro estado (ej. pendiente de confirmar) -> activo por
//          omisión: no hay ninguna señal real de que el canal esté cerrado.
export function chatActivoParaGrupo(citasGrupo: Cita[]): boolean {
  const ahora = Date.now()
  const futuraConfirmada = citasGrupo.some(c => c.estado === 'confirmed' && datetimeCita(c) >= ahora)
  if (futuraConfirmada) return true

  const masReciente = [...citasGrupo].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  if (!masReciente) return true
  if (masReciente.estado === 'cancelled' || masReciente.estado === 'cancelada_paciente') return false
  if (masReciente.estado !== 'completed') return true

  const tsCompletada = masReciente.completed_at ? new Date(masReciente.completed_at).getTime() : datetimeCita(masReciente)
  const horasTranscurridas = (ahora - tsCompletada) / 3600000
  return horasTranscurridas < HORAS_VENTANA_CHAT
}

export interface GrupoPaciente {
  clave: string
  pacienteNombre: string
  citas: Cita[]
}

export interface PacienteCardData {
  clave: string
  pacienteNombre: string
  pacienteId: string | null
  totalCitas: number
  proximaCita: Cita | null
  esPrimeraVezProxima: boolean
  historial: Cita[]
}

// Arma los datos derivados (próxima cita, historial, 1ª vez/subsecuente) a
// partir de todas las citas de un mismo paciente -- ver el criterio elegido
// en app/dashboard/citas/page.tsx (agrupación) para el contexto completo.
export function construirPacienteCard(grupo: GrupoPaciente, pacienteId: string | null): PacienteCardData {
  const ahora = Date.now()
  const candidatas = grupo.citas
    .filter(c => (c.estado === 'pending_verification' || c.estado === 'confirmed') && datetimeCita(c) >= ahora)
    .sort((a, b) => datetimeCita(a) - datetimeCita(b))
  const proximaCita = candidatas[0] || null

  const historial = grupo.citas
    .filter(c => c.id !== proximaCita?.id)
    .sort((a, b) => datetimeCita(b) - datetimeCita(a))

  const masAntigua = [...grupo.citas].sort((a, b) => datetimeCita(a) - datetimeCita(b))[0]
  const esPrimeraVezProxima = !!proximaCita && proximaCita.id === masAntigua.id

  return {
    clave: grupo.clave,
    pacienteNombre: grupo.pacienteNombre,
    pacienteId,
    totalCitas: grupo.citas.length,
    proximaCita,
    esPrimeraVezProxima,
    historial,
  }
}

// Una fusión de la que esta tarjeta es la "sobreviviente" -- se le absorbió
// un paciente identificado por `nombreOrigen`. Puede haber más de una (dos
// tarjetas distintas unidas por separado a esta misma).
export interface DeshacerInfo {
  fusionId: string
  nombreOrigen: string
  createdAt: string
}

function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

interface PacienteCardProps {
  data: PacienteCardData
  procesando: string | null
  rechazando: string | null
  motivoRechazo: string
  enviandoRechazo: boolean
  setRechazando: (id: string | null) => void
  setMotivoRechazo: (v: string) => void
  cambiarEstado: (citaId: string, nuevoEstado: Cita['estado']) => void
  confirmarRechazo: (citaId: string) => void
  cancelandoConfirmada: string | null
  motivoCancelacion: string
  enviandoCancelacion: boolean
  setCancelandoConfirmada: (id: string | null) => void
  setMotivoCancelacion: (v: string) => void
  confirmarCancelacionConfirmada: (citaId: string) => void
  // Sugerencia de "¿es la misma persona?" -- ver detección en
  // app/dashboard/citas/page.tsx (comparte teléfono o correo con otra
  // tarjeta que no se agrupó sola). null cuando no hay ninguna sospecha.
  // Ya no une con un clic -- onSolicitarUnion abre la ventana de
  // comparación+confirmación en el padre (ver ConfirmarUnionModal).
  sugerencia?: { clave: string; nombre: string } | null
  onSolicitarUnion?: (claveOrigen: string, claveDestino: string) => void
  // Uniones ya confirmadas de las que esta tarjeta es la sobreviviente --
  // se muestran como notita permanente con opción de deshacer, no solo
  // justo después de unir.
  deshacerInfo?: DeshacerInfo[]
  deshaciendoId?: string | null
  onDeshacerUnion?: (fusionId: string) => void
  // Estado real del canal de chat para TODO el paciente (todas sus citas
  // agrupadas, no solo las del tab activo) -- ver chatActivoParaGrupo().
  chatActivo: boolean
}

export default function PacienteCard({
  data, procesando, rechazando, motivoRechazo, enviandoRechazo,
  setRechazando, setMotivoRechazo, cambiarEstado, confirmarRechazo,
  cancelandoConfirmada, motivoCancelacion, enviandoCancelacion,
  setCancelandoConfirmada, setMotivoCancelacion, confirmarCancelacionConfirmada,
  sugerencia, onSolicitarUnion, deshacerInfo, deshaciendoId, onDeshacerUnion,
  chatActivo,
}: PacienteCardProps) {
  const router = useRouter()
  const { pacienteNombre, pacienteId, totalCitas, proximaCita, esPrimeraVezProxima, historial } = data
  const esProc = (citaId: string, suffix: string) => procesando === citaId + suffix
  const [confirmandoDeshacer, setConfirmandoDeshacer] = useState<string | null>(null)

  const irAlChat = () => {
    router.push(pacienteId ? `/dashboard/chat?paciente=${pacienteId}` : '/dashboard/chat')
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1E3A5F,#2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
            {pacienteNombre.charAt(0).toUpperCase()}
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pacienteNombre}</p>
        </div>
        <span style={{ flexShrink: 0, background: '#F3F4F6', color: '#374151', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {totalCitas} {totalCitas === 1 ? 'cita' : 'citas'}
        </span>
      </div>

      {sugerencia && onSolicitarUnion && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '8px 12px' }}>
          <span style={{ fontSize: 12, color: '#92400E' }}>
            ¿Es la misma persona que <strong>{sugerencia.nombre}</strong>?
          </span>
          <button
            onClick={() => onSolicitarUnion(data.clave, sugerencia.clave)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #D97706',
              color: '#92400E', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Link2 size={12} aria-hidden="true" />
            Comparar y unir
          </button>
        </div>
      )}

      {/* Notita permanente de uniones ya confirmadas -- visible siempre, no
          solo justo después de unir, con su propia confirmación (un clic
          más) antes de deshacer. Puede haber varias si esta tarjeta
          absorbió a más de un paciente por separado. */}
      {deshacerInfo && deshacerInfo.length > 0 && onDeshacerUnion && deshacerInfo.map(info => (
        <div key={info.fusionId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 10, padding: '8px 12px' }}>
          <span style={{ fontSize: 12, color: '#0F766E', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link2 size={12} aria-hidden="true" />
            Unida con <strong>{info.nombreOrigen}</strong> el {formatFechaCorta(info.createdAt)}
          </span>
          {confirmandoDeshacer === info.fusionId ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#0F766E' }}>¿Seguro?</span>
              <button
                onClick={() => { onDeshacerUnion(info.fusionId); setConfirmandoDeshacer(null) }}
                disabled={deshaciendoId === info.fusionId}
                style={{ background: '#0F766E', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                {deshaciendoId === info.fusionId ? 'Deshaciendo...' : 'Sí, deshacer'}
              </button>
              <button
                onClick={() => setConfirmandoDeshacer(null)}
                style={{ background: 'none', border: '1px solid #99F6E4', color: '#0F766E', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmandoDeshacer(info.fusionId)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #99F6E4', color: '#0F766E', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >
              <Undo2 size={12} aria-hidden="true" />
              Deshacer
            </button>
          )}
        </div>
      ))}

      {proximaCita && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Próxima cita
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{formatFecha(proximaCita.fecha)}</p>
              <p style={{ fontSize: 13, color: '#374151' }}>{proximaCita.hora?.slice(0, 5)}</p>
            </div>
            <span style={{ background: '#fff', color: '#1E3A5F', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, border: '1px solid #BFDBFE' }}>
              {esPrimeraVezProxima ? 'Primera vez' : 'Subsecuente'}
            </span>
          </div>

          <div className="cita-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {proximaCita.estado === 'pending_verification' && (
              <>
                <button className="action-btn" onClick={() => cambiarEstado(proximaCita.id, 'confirmed')} disabled={!!esProc(proximaCita.id, 'confirmed')} aria-busy={!!esProc(proximaCita.id, 'confirmed')} style={{ background: '#DCFCE7', color: '#059669' }}>
                  {esProc(proximaCita.id, 'confirmed') ? <span aria-hidden="true" style={{ width: 13, height: 13, border: '2px solid #05966944', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Check size={14} aria-hidden="true" />}
                  Confirmar
                </button>
                <button className="action-btn" onClick={() => { setRechazando(proximaCita.id); setMotivoRechazo('') }} disabled={!!esProc(proximaCita.id, 'cancelled')} style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  <XCircle size={14} aria-hidden="true" />
                  Rechazar
                </button>
              </>
            )}
            {proximaCita.estado === 'confirmed' && (
              <>
                <button className="action-btn" onClick={() => cambiarEstado(proximaCita.id, 'completed')} disabled={!!esProc(proximaCita.id, 'completed')} aria-busy={!!esProc(proximaCita.id, 'completed')} style={{ background: '#E0E7FF', color: '#3730A3' }}>
                  {esProc(proximaCita.id, 'completed') ? <span aria-hidden="true" style={{ width: 13, height: 13, border: '2px solid #3730A344', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <CheckCircle size={14} aria-hidden="true" />}
                  Marcar completada
                </button>
                <button className="action-btn" onClick={() => { setCancelandoConfirmada(proximaCita.id); setMotivoCancelacion('') }} disabled={!!esProc(proximaCita.id, 'cancelled')} style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  <XCircle size={14} aria-hidden="true" />
                  Cancelar
                </button>
              </>
            )}
          </div>

          {rechazando === proximaCita.id && (
            <div style={{ marginTop: 12, padding: 14, background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#991B1B', marginBottom: 6 }}>
                Motivo del rechazo *
              </label>
              <textarea
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                rows={3}
                placeholder="Explícale al paciente por qué no puedes atender esta cita..."
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #FECACA', borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="action-btn"
                  onClick={() => confirmarRechazo(proximaCita.id)}
                  disabled={!motivoRechazo.trim() || enviandoRechazo}
                  style={{ background: '#DC2626', color: '#fff', opacity: !motivoRechazo.trim() || enviandoRechazo ? 0.6 : 1 }}
                >
                  {enviandoRechazo ? 'Rechazando...' : 'Confirmar rechazo'}
                </button>
                <button
                  className="action-btn"
                  onClick={() => { setRechazando(null); setMotivoRechazo('') }}
                  disabled={enviandoRechazo}
                  style={{ background: '#F3F4F6', color: '#6B7280' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {cancelandoConfirmada === proximaCita.id && (
            <div style={{ marginTop: 12, padding: 14, background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#991B1B', marginBottom: 6 }}>
                Motivo de la cancelación *
              </label>
              <textarea
                value={motivoCancelacion}
                onChange={e => setMotivoCancelacion(e.target.value)}
                rows={3}
                placeholder="Explícale al paciente por qué no puedes atender esta cita ya confirmada..."
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #FECACA', borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="action-btn"
                  onClick={() => confirmarCancelacionConfirmada(proximaCita.id)}
                  disabled={!motivoCancelacion.trim() || enviandoCancelacion}
                  style={{ background: '#DC2626', color: '#fff', opacity: !motivoCancelacion.trim() || enviandoCancelacion ? 0.6 : 1 }}
                >
                  {enviandoCancelacion ? 'Cancelando...' : 'Confirmar cancelación'}
                </button>
                <button
                  className="action-btn"
                  onClick={() => { setCancelandoConfirmada(null); setMotivoCancelacion('') }}
                  disabled={enviandoCancelacion}
                  style={{ background: '#F3F4F6', color: '#6B7280' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {historial.length > 0 && (
        <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Historial
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {historial.map(c => {
              const cancelada = esCancelada(c)
              const completada = c.estado === 'completed'
              const Icono = completada ? Check : cancelada ? XCircle : Clock
              const color = completada ? '#6B7280' : cancelada ? '#DC2626' : statusColors[c.estado]?.text || '#6B7280'
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>{formatFecha(c.fecha)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color, opacity: cancelada ? 0.8 : 1 }}>
                    <Icono size={13} aria-hidden="true" />
                    {completada ? 'Completada' : cancelada ? 'Cancelada' : (statusColors[c.estado]?.label || c.estado)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <button
        onClick={irAlChat}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: chatActivo ? '#2A9D8F' : '#F3F4F6', color: chatActivo ? '#fff' : '#374151',
          border: chatActivo ? 'none' : '1px solid #E5E7EB', borderRadius: 10,
          padding: '12px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {chatActivo ? <MessageCircle size={16} aria-hidden="true" /> : <History size={16} aria-hidden="true" />}
        {chatActivo ? 'Chatear con paciente' : 'Ver historial de chat'}
      </button>
    </div>
  )
}
