import { MessageCircle, Phone, Mail, FileText, CheckCircle, XCircle, Check } from 'lucide-react'
import { Cita, MedicoData } from '@/lib/citas/types'
import { formatFecha, isFutura } from '@/lib/citas/fechas'

export const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending_verification: { bg: '#FEF3C7', text: '#92400E', label: 'Pendiente' },
  confirmed: { bg: '#DCFCE7', text: '#059669', label: 'Confirmada' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelada' },
  completed: { bg: '#E0E7FF', text: '#3730A3', label: 'Completada' },
  cancelada_paciente: { bg: '#FFEDD5', text: '#C2410C', label: 'Cancelada por el paciente' },
}

function getWhatsAppLink(medico: MedicoData | null, phone: string, fecha: string, hora: string, nombre: string) {
  const clean = phone.replace(/\D/g, '')
  const d = new Date(fecha + 'T00:00:00')
  const fechaFormateada = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  const nombreMedico = medico?.full_name || 'el médico'

  // Convertir especialidad a profesión
  const esp = medico?.specialty?.toLowerCase() || ''
  let profesion = ''

  if (esp.includes('alergolog')) profesion = 'alergólogo'
  else if (esp.includes('anestesiolog')) profesion = 'anestesiólogo'
  else if (esp.includes('angiolog')) profesion = 'angiólogo'
  else if (esp.includes('cardiolog')) profesion = 'cardiólogo'
  else if (esp.includes('cirug')) profesion = 'cirujano'
  else if (esp.includes('dermatolog')) profesion = 'dermatólogo'
  else if (esp.includes('endocrinolog')) profesion = 'endocrinólogo'
  else if (esp.includes('gastroenterolog')) profesion = 'gastroenterólogo'
  else if (esp.includes('geriatr')) profesion = 'geriatra'
  else if (esp.includes('hematolog')) profesion = 'hematólogo'
  else if (esp.includes('infectolog')) profesion = 'infectólogo'
  else if (esp.includes('medicina crítica')) profesion = 'intensivista'
  else if (esp.includes('medicina familiar')) profesion = 'médico familiar'
  else if (esp.includes('medicina física')) profesion = 'médico de rehabilitación'
  else if (esp.includes('medicina interna')) profesion = 'internista'
  else if (esp.includes('medicina general')) profesion = 'médico general'
  else if (esp.includes('nefrolog')) profesion = 'nefrólogo'
  else if (esp.includes('neonatolog')) profesion = 'neonatólogo'
  else if (esp.includes('neumolog')) profesion = 'neumólogo'
  else if (esp.includes('neurocirug')) profesion = 'neurocirujano'
  else if (esp.includes('neurolog')) profesion = 'neurólogo'
  else if (esp.includes('nutric')) profesion = 'nutriólogo'
  else if (esp.includes('oncolog')) profesion = 'oncólogo'
  else if (esp.includes('oftalmolog')) profesion = 'oftalmólogo'
  else if (esp.includes('ortopedia') || esp.includes('traumatolog')) profesion = 'traumatólogo'
  else if (esp.includes('otorrinolaringolog')) profesion = 'otorrinolaringólogo'
  else if (esp.includes('patolog')) profesion = 'patólogo'
  else if (esp.includes('pediatr')) profesion = 'pediatra'
  else if (esp.includes('psiquiatr')) profesion = 'psiquiatra'
  else if (esp.includes('radiolog')) profesion = 'radiólogo'
  else if (esp.includes('reumatolog')) profesion = 'reumatólogo'
  else if (esp.includes('urolog')) profesion = 'urólogo'
  else if (esp.includes('ginecolog') || esp.includes('obstetric')) profesion = 'ginecólogo'
  else profesion = medico?.specialty || ''

  let msg = `Hola ${nombre}, soy el Dr. ${nombreMedico}`
  if (profesion) msg += `, ${profesion}`
  msg += `.%0ATe espero en tu cita el ${fechaFormateada} a las ${hora?.slice(0, 5)}.`

  if (medico?.clinic_lat && medico?.clinic_lng) {
    msg += `%0A📍 Cómo llegar: https://maps.google.com/?q=${medico.clinic_lat},${medico.clinic_lng}`
  }

  msg += `%0A¿Tienes alguna duda? Confírmame por favor.`

  return `https://wa.me/52${clean}?text=${msg}`
}

interface CitaCardProps {
  cita: Cita
  medico: MedicoData | null
  procesando: string | null
  rechazando: string | null
  motivoRechazo: string
  enviandoRechazo: boolean
  setRechazando: (id: string | null) => void
  setMotivoRechazo: (v: string) => void
  cambiarEstado: (citaId: string, nuevoEstado: Cita['estado']) => void
  confirmarRechazo: (citaId: string) => void
}

export default function CitaCard({
  cita, medico, procesando, rechazando, motivoRechazo, enviandoRechazo,
  setRechazando, setMotivoRechazo, cambiarEstado, confirmarRechazo,
}: CitaCardProps) {
  const sc = statusColors[cita.estado] || statusColors.pending_verification
  const esProc = (suffix: string) => procesando === cita.id + suffix
  const futura = isFutura(cita.fecha)
  const horaMostrada = cita.hora?.slice(0, 5) || ''

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: '20px', opacity: cita.estado === 'cancelled' ? 0.65 : 1 }}>
      <div className="cita-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1E3A5F,#2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
            {cita.paciente_nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{cita.paciente_nombre}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ background: sc.bg, color: sc.text, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                {sc.label}
              </span>
              {futura && cita.estado !== 'cancelled' && (
                <span style={{ background: '#EEF2FF', color: '#1E3A5F', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                  Futura
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{formatFecha(cita.fecha)}</p>
          <p style={{ fontSize: 13, color: '#6B7280' }}>{horaMostrada}</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, padding: '14px 0', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', marginBottom: 16 }}>
        {cita.paciente_telefono && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={13} color="#9CA3AF" />
            <a href={`tel:${cita.paciente_telefono}`} style={{ fontSize: 13, color: '#111827', textDecoration: 'none' }}>{cita.paciente_telefono}</a>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={13} color="#9CA3AF" />
          <span style={{ fontSize: 13, color: '#6B7280' }}>{cita.paciente_email}</span>
        </div>
        {cita.motivo && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, gridColumn: '1 / -1' }}>
            <FileText size={13} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#6B7280' }}>{cita.motivo}</span>
          </div>
        )}
      </div>
      <div className="cita-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {cita.estado === 'pending_verification' && (
          <>
            <button className="action-btn" onClick={() => cambiarEstado(cita.id, 'confirmed')} disabled={!!esProc('confirmed')} style={{ background: '#DCFCE7', color: '#059669' }}>
              {esProc('confirmed') ? <span style={{ width: 13, height: 13, border: '2px solid #05966944', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Check size={14} />}
              Confirmar
            </button>
            <button className="action-btn" onClick={() => { setRechazando(cita.id); setMotivoRechazo('') }} disabled={!!esProc('cancelled')} style={{ background: '#FEE2E2', color: '#DC2626' }}>
              <XCircle size={14} />
              Rechazar
            </button>
          </>
        )}
        {cita.estado === 'confirmed' && (
          <>
            <button className="action-btn" onClick={() => cambiarEstado(cita.id, 'completed')} disabled={!!esProc('completed')} style={{ background: '#E0E7FF', color: '#3730A3' }}>
              {esProc('completed') ? <span style={{ width: 13, height: 13, border: '2px solid #3730A344', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <CheckCircle size={14} />}
              Marcar completada
            </button>
            <button className="action-btn" onClick={() => cambiarEstado(cita.id, 'cancelled')} disabled={!!esProc('cancelled')} style={{ background: '#FEE2E2', color: '#DC2626' }}>
              {esProc('cancelled') ? <span style={{ width: 13, height: 13, border: '2px solid #DC262644', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <XCircle size={14} />}
              Cancelar
            </button>
          </>
        )}
        {cita.estado !== 'cancelled' && cita.paciente_telefono && (
          <a href={getWhatsAppLink(medico, cita.paciente_telefono, cita.fecha, cita.hora, cita.paciente_nombre)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', borderRadius: 50, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <MessageCircle size={14} />
            WhatsApp
          </a>
        )}
      </div>
      {rechazando === cita.id && (
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
              onClick={() => confirmarRechazo(cita.id)}
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
    </div>
  )
}
