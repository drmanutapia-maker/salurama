'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import BsaCard from '@/components/hema/BsaCard'
import {
  ArrowLeft,
  Plus,
  FlaskConical,
  FileText,
  Ruler,
  AlertCircle,
  Activity,
  ChevronRight,
  Stethoscope,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientDetail {
  id: string
  curp: string
  display_name: string
  birth_date: string
  sex: 'M' | 'F'
  allergies: string | null
  nss: string | null
  tenant_id: string
  created_at: string
  last_measured_at: string | null
  last_weight_kg: number | null
  last_height_cm: number | null
  last_bsa_mosteller: number | null
  last_bsa_dubois: number | null
}

interface Measurement {
  id: string
  measured_at: string
  weight_kg: number
  height_cm: number
  bsa_mosteller: number
  bsa_dubois: number
}

interface PatientDiagnosis {
  id: string
  diagnosis_code: string
  diagnosed_at: string
  staging: string | null
  is_primary: boolean
  // Supabase devuelve arrays para relaciones FK en .select()
  diagnoses: {
    code: string
    description_es: string
    category: string | null
  }[] | null
}

interface RecentOrder {
  id: string
  status: string
  cycle_number: number
  scheduled_for: string
  // Supabase devuelve array para la relación FK
  protocols: { code: string; name: string }[] | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcAge(birthDate: string): number {
  const today = new Date()
  const born  = new Date(birthDate)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function maskCurp(curp: string): string {
  if (curp.length !== 18) return curp
  return `${curp.slice(0, 4)}••••••••••${curp.slice(14)}`
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#9CA3AF', validated: '#D97706', signed: '#16A34A',
  dispensed: '#1E3A5F', administered: '#2A9D8F', cancelled: '#DC2626',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', validated: 'Por firmar', signed: 'Firmada',
  dispensed: 'Dispensada', administered: 'Administrada', cancelled: 'Cancelada',
}

const DX_CATEGORY_COLOR: Record<string, string> = {
  mieloma: '#7C3AED', linfoma: '#0369A1', leucemia: '#DC2626',
  mds: '#B45309', mpn: '#047857', otro: '#6B7280',
}

// ─── BSA Mini-chart ──────────────────────────────────────────────────────────

function BsaChart({ measurements }: { measurements: Measurement[] }) {
  if (measurements.length === 0) return null
  const values = measurements.map((m) => m.bsa_mosteller)
  const maxVal = Math.max(...values, 2.5)
  const minVal = Math.min(...values, 1.0)
  const range  = maxVal - minVal || 1

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Historial BSA (Mosteller)
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
        {measurements.slice(0, 10).reverse().map((m, i) => {
          const pct = ((m.bsa_mosteller - minVal) / range) * 0.75 + 0.25
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 }}>
              <span style={{ fontSize: 9, color: '#6B7280', textAlign: 'center' }}>
                {m.bsa_mosteller.toFixed(2)}
              </span>
              <div
                title={`${formatDate(m.measured_at)} — ${m.bsa_mosteller} m²`}
                style={{
                  width: '100%',
                  height: `${Math.round(pct * 40)}px`,
                  background: i === measurements.slice(0, 10).length - 1 ? '#1E3A5F' : '#93C5FD',
                  borderRadius: 4,
                  minHeight: 6,
                }}
              />
              {i === 0 && (
                <span style={{ fontSize: 9, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                  {formatDate(m.measured_at).split(' ').slice(0, 2).join(' ')}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
        {measurements.length} medición{measurements.length !== 1 ? 'es' : ''} registrada{measurements.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientProfilePage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string

  const [patient, setPatient]           = useState<PatientDetail | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [diagnoses, setDiagnoses]       = useState<PatientDiagnosis[]>([])
  const [orders, setOrders]             = useState<RecentOrder[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login?next=/hema/pacientes'); return }

      const [patRes, measRes, dxRes, ordRes] = await Promise.all([
        supabase.rpc('hema_get_patient', { p_patient_id: patientId }),
        supabase.schema('hema').from('patient_measurements')
          .select('id, measured_at, weight_kg, height_cm, bsa_mosteller, bsa_dubois')
          .eq('patient_id', patientId)
          .order('measured_at', { ascending: false })
          .limit(20),
        supabase.schema('hema').from('patient_diagnoses')
          .select('id, diagnosis_code, diagnosed_at, staging, is_primary, diagnoses(code, description_es, category)')
          .eq('patient_id', patientId)
          .order('is_primary', { ascending: false }),
        supabase.schema('hema').from('orders')
          .select('id, status, cycle_number, scheduled_for, protocols(code, name)')
          .eq('patient_id', patientId)
          .order('scheduled_for', { ascending: false })
          .limit(5),
      ])

      if (!mounted) return

      if (patRes.error) { setError(patRes.error.message); setLoading(false); return }

      const rows = patRes.data as PatientDetail[]
      if (!rows || rows.length === 0) { setError('Paciente no encontrado'); setLoading(false); return }

      setPatient(rows[0])
      setMeasurements((measRes.data as Measurement[]) ?? [])
      setDiagnoses((dxRes.data as PatientDiagnosis[]) ?? [])
      setOrders((ordRes.data as RecentOrder[]) ?? [])
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [patientId, router])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div style={{ padding: 20 }}>
        <Link href="/hema/pacientes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={16} /> Pacientes
        </Link>
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 20, display: 'flex', gap: 12 }}>
          <AlertCircle size={20} color="#DC2626" />
          <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 600 }}>{error ?? 'Paciente no encontrado'}</p>
        </div>
      </div>
    )
  }

  const age = calcAge(patient.birth_date)
  const hasRecentMeasurement = patient.last_measured_at !== null
  const measurementDays = patient.last_measured_at
    ? Math.floor((Date.now() - new Date(patient.last_measured_at).getTime()) / 86_400_000)
    : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* ─── Back ──────────────────────────────────────────────────────── */}
      <Link
        href="/hema/pacientes"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 16, minHeight: 44 }}
      >
        <ArrowLeft size={16} /> Pacientes
      </Link>

      {/* ─── Patient header card ────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)',
          borderRadius: 16,
          padding: '20px 20px 24px',
          marginBottom: 16,
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: patient.sex === 'F' ? '#FCE7F3' : '#DBEAFE',
              color: patient.sex === 'F' ? '#BE185D' : '#1E40AF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 20,
              fontFamily: 'Fraunces, serif', flexShrink: 0,
            }}
          >
            {(patient.display_name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 2, lineHeight: 1.2 }}>
              {patient.display_name}
            </h1>
            <p style={{ fontSize: 12, color: '#7EA8C9', fontFamily: 'monospace', marginBottom: 4 }}>
              {maskCurp(patient.curp)}
            </p>
            <p style={{ fontSize: 13, color: '#A0BBCC' }}>
              {age} años · {patient.sex === 'F' ? 'Femenino' : 'Masculino'}
              {patient.nss ? ` · NSS: ${patient.nss}` : ''}
            </p>
          </div>
        </div>

        {patient.allergies && (
          <div
            style={{
              marginTop: 14,
              padding: '8px 12px',
              background: 'rgba(220,38,38,0.18)',
              borderRadius: 10,
              border: '1px solid rgba(220,38,38,0.3)',
            }}
          >
            <p style={{ fontSize: 12, color: '#FCA5A5', fontWeight: 700, marginBottom: 2 }}>⚠ Alergias</p>
            <p style={{ fontSize: 13, color: '#FECACA' }}>{patient.allergies}</p>
          </div>
        )}
      </div>

      {/* ─── Quick actions ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Nueva medición', href: `/hema/pacientes/${patientId}/medicion`, icon: Ruler, color: '#1E3A5F' },
          { label: 'Nueva indicación', href: `/hema/ordenes/nueva?patient=${patientId}`, icon: FileText, color: '#16A34A' },
          { label: 'Subir labs', href: `/hema/labs/nuevo?patient=${patientId}`, icon: FlaskConical, color: '#7C3AED' },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '14px 8px',
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14,
              textDecoration: 'none', textAlign: 'center', minHeight: 72,
              fontSize: 12, fontWeight: 700, color: '#374151',
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            {label}
          </Link>
        ))}
      </div>

      {/* ─── BSA / medición ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#111827' }}>
            Superficie corporal
          </h2>
          <Link
            href={`/hema/pacientes/${patientId}/medicion`}
            style={{ fontSize: 13, color: '#1E3A5F', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, minHeight: 44 }}
          >
            <Plus size={14} /> Nueva
          </Link>
        </div>

        {hasRecentMeasurement ? (
          <div>
            <BsaCard
              mosteller={patient.last_bsa_mosteller!}
              dubois={patient.last_bsa_dubois!}
              measuredAt={patient.last_measured_at!}
              weightKg={patient.last_weight_kg!}
              heightCm={patient.last_height_cm!}
            />
            <BsaChart measurements={measurements} />
          </div>
        ) : (
          <div
            style={{
              background: '#FFFBEB', border: '1.5px dashed #D97706',
              borderRadius: 14, padding: '24px 20px', textAlign: 'center',
            }}
          >
            <Activity size={32} color="#D97706" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
              Sin mediciones registradas
            </p>
            <p style={{ fontSize: 13, color: '#B45309', marginBottom: 16 }}>
              Registra peso y talla para calcular la superficie corporal
            </p>
            <Link
              href={`/hema/pacientes/${patientId}/medicion`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#D97706', color: '#fff',
                borderRadius: 12, padding: '10px 20px',
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}
            >
              <Ruler size={15} /> Registrar medición
            </Link>
          </div>
        )}
      </div>

      {/* ─── Diagnósticos ───────────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: 16, overflow: 'hidden', marginBottom: 16,
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#111827' }}>
            Diagnósticos
          </h2>
          <button
            title="Agregar diagnóstico (próximamente)"
            style={{ background: 'none', border: 'none', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 4, color: '#9CA3AF', fontSize: 13, fontWeight: 600, padding: '8px 4px', minHeight: 44 }}
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {diagnoses.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Stethoscope size={28} color="#D1D5DB" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sin diagnósticos registrados</p>
          </div>
        ) : (
          diagnoses.map((dx, i) => {
            const dxInfo = Array.isArray(dx.diagnoses) ? dx.diagnoses[0] : null
            const cat = dxInfo?.category ?? 'otro'
            const catColor = DX_CATEGORY_COLOR[cat] ?? '#6B7280'
            return (
              <div
                key={dx.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: i < diagnoses.length - 1 ? '1px solid #F3F4F6' : 'none',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${catColor}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2,
                    fontFamily: 'Fraunces, serif', fontSize: 11, fontWeight: 900, color: catColor,
                  }}
                >
                  {cat.slice(0, 3).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: catColor }}>
                      {dxInfo?.code ?? dx.diagnosis_code}
                    </span>
                    {dx.is_primary && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: `${catColor}18`, color: catColor, borderRadius: 6, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Principal
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: '#111827', fontWeight: 600, marginBottom: 2 }}>
                    {dxInfo?.description_es ?? ''}
                  </p>
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                    Diagnóstico: {formatDate(dx.diagnosed_at)}
                    {dx.staging ? ` · Estadio ${dx.staging}` : ''}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── Últimas indicaciones ────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: 16, overflow: 'hidden', marginBottom: 16,
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#111827' }}>
            Indicaciones recientes
          </h2>
          <Link
            href={`/hema/ordenes/nueva?patient=${patientId}`}
            style={{ fontSize: 13, color: '#16A34A', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, minHeight: 44 }}
          >
            <Plus size={14} /> Nueva
          </Link>
        </div>

        {orders.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <FileText size={28} color="#D1D5DB" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sin indicaciones para este paciente</p>
          </div>
        ) : (
          orders.map((o, i) => (
            <Link
              key={o.id}
              href={`/hema/ordenes/${o.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderBottom: i < orders.length - 1 ? '1px solid #F3F4F6' : 'none',
                textDecoration: 'none', minHeight: 60,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[o.status] ?? '#9CA3AF', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                  {(o.protocols?.[0]?.code) ?? '—'} · Ciclo {o.cycle_number}
                </p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {formatDate(o.scheduled_for)} ·{' '}
                  <span style={{ color: STATUS_COLOR[o.status], fontWeight: 600 }}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </p>
              </div>
              <ChevronRight size={16} color="#D1D5DB" />
            </Link>
          ))
        )}
      </div>

      {/* ─── Fecha registro ─────────────────────────────────────────────── */}
      <p style={{ fontSize: 11, color: '#D1D5DB', textAlign: 'center', marginTop: 8 }}>
        Paciente registrado el {formatDate(patient.created_at)}
      </p>
    </>
  )
}
