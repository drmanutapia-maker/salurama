'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import {
  Plus,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  FlaskConical,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface HemaSummary {
  ordenes_hoy: number
  pacientes_activos: number
  labs_pendientes: number
  indicaciones_por_firmar: number
}

interface OrdenHoy {
  id: string
  patient_name: string
  protocol_code: string
  status: 'draft' | 'validated' | 'signed' | 'dispensed' | 'administered' | 'cancelled'
  scheduled_for: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<OrdenHoy['status'], string> = {
  draft: 'Borrador',
  validated: 'Por firmar',
  signed: 'Firmada',
  dispensed: 'Dispensada',
  administered: 'Administrada',
  cancelled: 'Cancelada',
}

const STATUS_COLOR: Record<OrdenHoy['status'], string> = {
  draft: '#9CA3AF',
  validated: '#D97706',
  signed: '#16A34A',
  dispensed: '#1E3A5F',
  administered: '#2A9D8F',
  cancelled: '#DC2626',
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function HemaDashboard() {
  const router = useRouter()
  const [summary, setSummary] = useState<HemaSummary | null>(null)
  const [ordenesHoy, setOrdenesHoy] = useState<OrdenHoy[]>([])
  const [doctorName, setDoctorName] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [idOrdenPorFirmar, setIdOrdenPorFirmar] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login?next=/hema')
        return
      }

      // Obtener perfil del médico
      const { data: doctor } = await supabase
        .from('doctors')
        .select('full_name, specialty')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!mounted) return
      setDoctorName(doctor?.full_name ?? '')

      // Obtener tenant_id desde JWT claim
      try {
        const payload = JSON.parse(
          atob(
            session.access_token
              .split('.')[1]
              .replace(/-/g, '+')
              .replace(/_/g, '/')
          )
        )
        const tid = payload.tenant_id as string | undefined
        if (tid) setTenantId(tid)
      } catch {}

      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [router])

  // Cargar datos de hema.* cuando tengamos tenant_id
  useEffect(() => {
    if (!tenantId) return
    let mounted = true

    async function loadHemaData() {
      const hoy = new Date().toISOString().split('T')[0]

      // Órdenes de hoy
      const { data: ordenes } = await supabase
        .schema('hema')
        .from('orders')
        .select(
          `id, status, scheduled_for,
           patients ( full_name_encrypted ),
           protocols ( code )`
        )
        .eq('tenant_id', tenantId!)
        .eq('scheduled_for', hoy)
        .order('created_at', { ascending: false })
        .limit(10)

      // Pacientes activos (con órdenes en los últimos 90 días)
      const hace90 = new Date()
      hace90.setDate(hace90.getDate() - 90)
      const { count: pacientes } = await supabase
        .schema('hema')
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId!)

      // Labs pendientes de revisión
      const { count: labs } = await supabase
        .schema('hema')
        .from('lab_panels')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId!)
        .is('reviewed_by', null)

      // Indicaciones por firmar (.limit(2): solo necesitamos saber si hay 0, 1 o 2+)
      const { data: ordenesPorFirmar } = await supabase
        .schema('hema')
        .from('orders')
        .select('id')
        .eq('tenant_id', tenantId!)
        .eq('status', 'validated')
        .limit(2)
      const porFirmar = ordenesPorFirmar?.length ?? 0

      if (!mounted) return

      setSummary({
        ordenes_hoy: ordenes?.length ?? 0,
        pacientes_activos: pacientes ?? 0,
        labs_pendientes: labs ?? 0,
        indicaciones_por_firmar: porFirmar,
      })
      setIdOrdenPorFirmar(porFirmar === 1 ? (ordenesPorFirmar![0].id as string) : null)

      // Mapear órdenes para mostrar
      const mapped: OrdenHoy[] = (ordenes ?? []).map((o: any) => ({
        id: o.id,
        patient_name: o.patients
          ? `Paciente ${o.patients.id?.slice(0, 6) ?? '—'}`
          : '—',
        protocol_code: o.protocols?.code ?? '—',
        status: o.status,
        scheduled_for: o.scheduled_for,
      }))
      setOrdenesHoy(mapped)
    }

    loadHemaData()
    return () => { mounted = false }
  }, [tenantId])

  const saludo = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <style>{`@keyframes hema-spin{to{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #E5E7EB',
            borderTopColor: '#1E3A5F',
            borderRadius: '50%',
            animation: 'hema-spin 0.8s linear infinite',
          }}
        />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .hema-stat-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; }
        .hema-order-row:hover { background: #F0F4F8 !important; }
      `}</style>

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)',
          borderRadius: 16,
          padding: '20px 20px 24px',
          marginBottom: 20,
          color: '#fff',
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: '#7EA8C9',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 4,
          }}
        >
          {saludo()}
        </p>
        <h1
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 26,
            fontWeight: 900,
            color: '#fff',
            marginBottom: 4,
            lineHeight: 1.2,
          }}
        >
          {doctorName ? `Dr. ${doctorName}` : 'HEMA Clínico'}
        </h1>
        <p
          style={{
            fontSize: 13,
            color: '#7EA8C9',
            marginBottom: 20,
          }}
        >
          {formatFecha(new Date().toISOString())}
        </p>

        {/* Botón principal: Nueva Indicación */}
        <Link
          href="/hema/ordenes/nueva"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: '#16A34A',
            color: '#fff',
            borderRadius: 14,
            padding: '14px 24px',
            fontSize: 15,
            fontWeight: 700,
            textDecoration: 'none',
            minHeight: 52,
            boxShadow: '0 2px 8px rgba(22,163,74,0.35)',
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          Nueva Indicación
        </Link>
      </div>

      {/* ── Métricas del día ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            icon: FileText,
            value: summary?.ordenes_hoy ?? '—',
            label: 'Indicaciones hoy',
            color: '#1E3A5F',
            bg: '#EFF4FB',
            href: '/hema/ordenes/nueva',
          },
          {
            icon: Users,
            value: summary?.pacientes_activos ?? '—',
            label: 'Pacientes',
            color: '#2A9D8F',
            bg: '#EDFAF8',
            href: '/hema/pacientes',
          },
          {
            icon: FlaskConical,
            value: summary?.labs_pendientes ?? '—',
            label: 'Labs sin revisar',
            color: summary?.labs_pendientes ? '#D97706' : '#6B7280',
            bg: summary?.labs_pendientes ? '#FFFBEB' : '#F9FAFB',
            href: '/hema/labs',
          },
          {
            icon: CheckCircle2,
            value: summary?.indicaciones_por_firmar ?? '—',
            label: 'Por firmar',
            color: summary?.indicaciones_por_firmar ? '#DC2626' : '#6B7280',
            bg: summary?.indicaciones_por_firmar ? '#FEF2F2' : '#F9FAFB',
            href: idOrdenPorFirmar ? `/hema/ordenes/${idOrdenPorFirmar}` : '/hema/ordenes/nueva',
          },
        ].map(({ icon: Icon, value, label, color, bg, href }) => (
          <Link
            key={label}
            href={href}
            className="hema-stat-card"
            style={{
              background: bg,
              borderRadius: 14,
              padding: '16px',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              border: '1px solid #E5E7EB',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${color}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={18} color={color} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: 'Fraunces, serif',
                  fontSize: 28,
                  fontWeight: 900,
                  color,
                  lineHeight: 1,
                  marginBottom: 2,
                }}
              >
                {value}
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>
                {label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Alertas ──────────────────────────────────────────────────── */}
      {((summary?.labs_pendientes ?? 0) > 0 ||
        (summary?.indicaciones_por_firmar ?? 0) > 0) && (
        <div
          style={{
            background: '#FFFBEB',
            border: '1.5px solid #FDE68A',
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#92400E',
                marginBottom: 6,
              }}
            >
              Pendientes de atención
            </p>
            {(summary?.indicaciones_por_firmar ?? 0) > 0 && (
              <Link
                href={idOrdenPorFirmar ? `/hema/ordenes/${idOrdenPorFirmar}` : '/hema/ordenes/nueva'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: '#D97706',
                  textDecoration: 'none',
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                <span>
                  {summary?.indicaciones_por_firmar} indicación
                  {summary!.indicaciones_por_firmar !== 1 ? 'es' : ''} por firmar
                </span>
                <ChevronRight size={14} />
              </Link>
            )}
            {(summary?.labs_pendientes ?? 0) > 0 && (
              <Link
                href="/hema/labs"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: '#D97706',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <span>
                  {summary?.labs_pendientes} reporte
                  {summary!.labs_pendientes !== 1 ? 's' : ''} de labs sin revisar
                </span>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Indicaciones de hoy ──────────────────────────────────────── */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #F3F4F6',
          }}
        >
          <h2
            style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 17,
              fontWeight: 900,
              color: '#111827',
            }}
          >
            Indicaciones de Hoy
          </h2>
          <Link
            href="/hema/ordenes/nueva"
            style={{
              fontSize: 13,
              color: '#1E3A5F',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            Ver todas <ChevronRight size={14} />
          </Link>
        </div>

        {ordenesHoy.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <Clock
              size={36}
              color="#D1D5DB"
              style={{ margin: '0 auto 12px' }}
            />
            <p style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 500 }}>
              Sin indicaciones programadas para hoy
            </p>
            <Link
              href="/hema/ordenes/nueva"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 16,
                background: '#1E3A5F',
                color: '#fff',
                borderRadius: 10,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Plus size={14} />
              Crear indicación
            </Link>
          </div>
        ) : (
          ordenesHoy.map((orden) => (
            <Link
              key={orden.id}
              href={`/hema/ordenes/${orden.id}`}
              className="hema-order-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                textDecoration: 'none',
                borderBottom: '1px solid #F9FAFB',
                transition: 'background 0.12s',
                background: '#fff',
                minHeight: 64,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: STATUS_COLOR[orden.status],
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#111827',
                      marginBottom: 2,
                    }}
                  >
                    {orden.patient_name}
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>
                    {orden.protocol_code} ·{' '}
                    <span
                      style={{
                        color: STATUS_COLOR[orden.status],
                        fontWeight: 600,
                      }}
                    >
                      {STATUS_LABEL[orden.status]}
                    </span>
                  </p>
                </div>
              </div>
              <ChevronRight size={16} color="#D1D5DB" />
            </Link>
          ))
        )}
      </div>

      {/* ── Accesos rápidos ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {[
          {
            label: 'Nuevo Paciente',
            href: '/hema/pacientes/nuevo',
            icon: Users,
            color: '#2A9D8F',
          },
          {
            label: 'Subir Labs',
            href: '/hema/labs/nuevo',
            icon: FlaskConical,
            color: '#8B5CF6',
          },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 14,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
              minHeight: 52,
            }}
          >
            <Icon size={18} color={color} />
            {label}
          </Link>
        ))}
      </div>
    </>
  )
}
