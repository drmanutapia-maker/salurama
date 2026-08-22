import { useState } from 'react'
import { X, Link2, Check, XCircle, Clock } from 'lucide-react'
import { Cita } from '@/lib/citas/types'
import { formatFecha } from '@/lib/citas/fechas'
import { statusColors } from './PacienteCard'

export interface GrupoComparable {
  clave: string
  pacienteNombre: string
  citas: Cita[]
}

const esCancelada = (c: Cita) => c.estado === 'cancelled' || c.estado === 'cancelada_paciente'

// Columna de un lado del comparador -- nombre, correos/teléfonos usados
// (todos los distintos que aparezcan en sus citas, no solo el más reciente,
// para que el médico vea si hubo variaciones) y el historial completo.
function Columna({ grupo }: { grupo: GrupoComparable }) {
  const correos = Array.from(new Set(grupo.citas.map(c => c.paciente_email.trim().toLowerCase())))
  const telefonos = Array.from(new Set(grupo.citas.map(c => c.paciente_telefono).filter(Boolean)))
  const citasOrdenadas = [...grupo.citas].sort((a, b) => `${b.fecha}T${b.hora}`.localeCompare(`${a.fecha}T${a.hora}`))

  return (
    <div style={{ flex: 1, minWidth: 0, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 10, wordBreak: 'break-word' }}>{grupo.pacienteNombre}</p>

      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Correo(s)</p>
        {correos.map(c => <p key={c} style={{ fontSize: 13, color: '#374151', wordBreak: 'break-word' }}>{c}</p>)}
      </div>

      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Teléfono(s)</p>
        {telefonos.length > 0 ? telefonos.map(t => <p key={t} style={{ fontSize: 13, color: '#374151' }}>{t}</p>) : <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sin teléfono</p>}
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        Historial ({citasOrdenadas.length} {citasOrdenadas.length === 1 ? 'cita' : 'citas'})
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
        {citasOrdenadas.map(c => {
          const cancelada = esCancelada(c)
          const completada = c.estado === 'completed'
          const Icono = completada ? Check : cancelada ? XCircle : Clock
          const color = completada ? '#6B7280' : cancelada ? '#DC2626' : statusColors[c.estado]?.text || '#6B7280'
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#374151' }}>{formatFecha(c.fecha)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color, opacity: cancelada ? 0.8 : 1, flexShrink: 0 }}>
                <Icono size={11} aria-hidden="true" />
                {completada ? 'Completada' : cancelada ? 'Cancelada' : (statusColors[c.estado]?.label || c.estado)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ConfirmarUnionModal({
  origen, destino, confirmando, onCancel, onConfirm,
}: {
  origen: GrupoComparable
  destino: GrupoComparable
  confirmando: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const [nombreEscrito, setNombreEscrito] = useState('')
  const nombreCoincide = nombreEscrito.trim().toLowerCase() === destino.pacienteNombre.trim().toLowerCase()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-confirmar-union"
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
      onClick={confirmando ? undefined : onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 720, width: '100%', maxHeight: '90vh', overflowY: 'auto', fontFamily: "'DM Sans', sans-serif" }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <h2 id="titulo-confirmar-union" style={{ fontSize: 19, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 size={18} color="#D97706" aria-hidden="true" />
            ¿Unir estos dos pacientes?
          </h2>
          <button onClick={onCancel} disabled={confirmando} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: confirmando ? 'not-allowed' : 'pointer', color: '#6B7280', flexShrink: 0 }}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
          Compara con cuidado ambos historiales antes de confirmar -- una vez unidos, se verán como una sola tarjeta con todas sus citas juntas. No se modifica ningún expediente médico, y la unión se puede deshacer después.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          <Columna grupo={origen} />
          <Columna grupo={destino} />
        </div>

        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 16 }}>
          <label htmlFor="confirmar-nombre-union" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>
            Para confirmar, escribe el nombre del paciente que sobrevive: <strong>{destino.pacienteNombre}</strong>
          </label>
          <input
            id="confirmar-nombre-union"
            type="text"
            value={nombreEscrito}
            onChange={e => setNombreEscrito(e.target.value)}
            disabled={confirmando}
            placeholder={destino.pacienteNombre}
            autoComplete="off"
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #FDE68A', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', marginBottom: 14 }}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={onConfirm}
              disabled={!nombreCoincide || confirmando}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: '#D97706', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700,
                cursor: (!nombreCoincide || confirmando) ? 'not-allowed' : 'pointer',
                opacity: (!nombreCoincide || confirmando) ? 0.5 : 1,
              }}
            >
              <Link2 size={14} aria-hidden="true" />
              {confirmando ? 'Uniendo...' : 'Confirmar unión'}
            </button>
            <button
              onClick={onCancel}
              disabled={confirmando}
              style={{ background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: confirmando ? 'not-allowed' : 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
