'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import {
  Plus,
  Search,
  ChevronRight,
  User,
  Clock,
  AlertCircle,
  FlaskConical,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientRow {
  id: string
  curp: string
  display_name: string
  birth_date: string
  sex: 'M' | 'F'
  allergies: string | null
  nss: string | null
  created_at: string
  last_order_date: string | null
  last_order_status: string | null
  last_order_protocol: string | null
  primary_dx_code: string | null
  primary_dx_desc: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskCurp(curp: string): string {
  if (curp.length !== 18) return curp
  return `${curp.slice(0, 4)}••••••••••${curp.slice(14)}`
}

function calcAge(birthDate: string): number {
  const today = new Date()
  const born = new Date(birthDate)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}

const STATUS_LABEL: Record<string, string> = {
  draft:        'Borrador',
  validated:    'Por firmar',
  signed:       'Firmada',
  dispensed:    'Dispensada',
  administered: 'Administrada',
  cancelled:    'Cancelada',
}

const STATUS_COLOR: Record<string, string> = {
  draft:        '#9CA3AF',
  validated:    '#D97706',
  signed:       '#16A34A',
  dispensed:    '#1E3A5F',
  administered: '#2A9D8F',
  cancelled:    '#DC2626',
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F3F4F6' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 14, background: '#F3F4F6', borderRadius: 6, width: '60%' }} />
        <div style={{ height: 12, background: '#F3F4F6', borderRadius: 6, width: '40%' }} />
      </div>
    </div>
  )
}

// ─── Patient Card (mobile) ────────────────────────────────────────────────────

function PatientCard({ p }: { p: PatientRow }) {
  const age = calcAge(p.birth_date)
  const initials = (p.display_name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <Link
      href={`/hema/pacientes/${p.id}`}
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textDecoration: 'none',
        minHeight: 76,
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: p.sex === 'F' ? '#FCE7F3' : '#DBEAFE',
          color: p.sex === 'F' ? '#BE185D' : '#1E40AF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 15,
          fontFamily: 'Fraunces, serif',
          flexShrink: 0,
        }}
      >
        {initials || <User size={18} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#111827',
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {p.display_name || '—'}
        </p>
        <p style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>
          {maskCurp(p.curp)}
          <span style={{ fontFamily: "'DM Sans', sans-serif" }}> · {age} años</span>
        </p>
        {p.primary_dx_desc && (
          <p
            style={{
              fontSize: 11,
              color: '#1E3A5F',
              fontWeight: 600,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p.primary_dx_code} · {p.primary_dx_desc}
          </p>
        )}
        {p.last_order_date && p.last_order_status && (
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
            Última orden: {p.last_order_protocol ?? '—'} ·{' '}
            <span
              style={{
                color: STATUS_COLOR[p.last_order_status] ?? '#6B7280',
                fontWeight: 600,
              }}
            >
              {STATUS_LABEL[p.last_order_status] ?? p.last_order_status}
            </span>
            {' '}· {formatShortDate(p.last_order_date)}
          </p>
        )}
      </div>

      <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
    </Link>
  )
}

// ─── Desktop row ──────────────────────────────────────────────────────────────

function PatientRow({ p }: { p: PatientRow }) {
  const age = calcAge(p.birth_date)

  return (
    <Link
      href={`/hema/pacientes/${p.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.2fr 1fr 1.4fr',
        gap: 12,
        padding: '14px 20px',
        alignItems: 'center',
        borderBottom: '1px solid #F3F4F6',
        textDecoration: 'none',
        transition: 'background 0.12s',
        minHeight: 56,
      }}
      className="hema-table-row"
    >
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
          {p.display_name || '—'}
        </p>
        <p style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>
          {maskCurp(p.curp)}
        </p>
      </div>
      <p style={{ fontSize: 13, color: '#374151' }}>
        {age} años · {p.sex === 'F' ? 'Femenino' : 'Masculino'}
      </p>
      <p
        style={{
          fontSize: 12,
          color: '#1E3A5F',
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {p.primary_dx_code ? `${p.primary_dx_code} · ${p.primary_dx_desc ?? ''}` : '—'}
      </p>
      <div>
        {p.last_order_status ? (
          <>
            <p style={{ fontSize: 13, color: '#374151' }}>
              {p.last_order_protocol ?? '—'}
            </p>
            <p
              style={{
                fontSize: 11,
                color: STATUS_COLOR[p.last_order_status] ?? '#6B7280',
                fontWeight: 600,
              }}
            >
              {STATUS_LABEL[p.last_order_status] ?? p.last_order_status}
              {p.last_order_date ? ` · ${formatShortDate(p.last_order_date)}` : ''}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>Sin indicaciones</p>
        )}
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PacientesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showLabsBanner = searchParams.get('labs') === 'true'
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login?next=/hema/pacientes'); return }

      const { data, error: rpcError } = await supabase.rpc('hema_list_patients', {
        p_limit: 200,
        p_offset: 0,
      })

      if (!mounted) return
      if (rpcError) { setError(rpcError.message); setLoading(false); return }
      setPatients((data as PatientRow[]) ?? [])
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [router])

  const filtered = useMemo(() => {
    if (!query.trim()) return patients
    const q = query.toUpperCase().trim()
    return patients.filter(
      (p) =>
        p.curp.includes(q) ||
        p.display_name.toUpperCase().includes(q) ||
        (p.primary_dx_code ?? '').includes(q),
    )
  }, [patients, query])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .hema-table-row:hover { background: #F8F9FA; }
        .hema-search:focus { outline: none; border-color: #1E3A5F; box-shadow: 0 0 0 3px rgba(30,58,95,0.15); }
      `}</style>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 24,
              fontWeight: 900,
              color: '#1E3A5F',
              marginBottom: 2,
            }}
          >
            Pacientes
          </h1>
          {!loading && (
            <p style={{ fontSize: 13, color: '#6B7280' }}>
              {patients.length} paciente{patients.length !== 1 ? 's' : ''} registrado{patients.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <Link
          href="/hema/pacientes/nuevo"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#16A34A',
            color: '#fff',
            borderRadius: 12,
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            minHeight: 48,
            boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Nuevo paciente
        </Link>
      </div>

      {/* ─── Banner: viene de "+ Nuevo panel" en /hema/labs ───────────────── */}
      {showLabsBanner && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(124,58,237,0.08)', border: '1.5px solid rgba(124,58,237,0.3)',
            borderRadius: 14, padding: '12px 16px', marginBottom: 16,
          }}
        >
          <FlaskConical size={18} color="#7C3AED" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#6D28D9', fontWeight: 600, margin: 0 }}>
            Selecciona un paciente para subir sus labs
          </p>
        </div>
      )}

      {/* ─── Búsqueda ───────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search
          size={16}
          color="#9CA3AF"
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />
        <input
          className="hema-search"
          type="text"
          placeholder="Buscar por CURP o nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px 12px 42px',
            fontSize: 14,
            borderRadius: 12,
            border: '1.5px solid #E5E7EB',
            background: '#fff',
            fontFamily: "'DM Sans', sans-serif",
            boxSizing: 'border-box',
            minHeight: 48,
            transition: 'border-color 0.15s',
          }}
        />
      </div>

      {/* ─── Contenido ──────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>
              Error al cargar pacientes
            </p>
            <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <User size={40} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
          <p
            style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 18,
              fontWeight: 700,
              color: '#374151',
              marginBottom: 6,
            }}
          >
            {query ? 'Sin resultados' : 'Sin pacientes registrados'}
          </p>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>
            {query
              ? `No se encontraron pacientes con "${query}"`
              : 'Registra tu primer paciente para comenzar'}
          </p>
          {!query && (
            <Link
              href="/hema/pacientes/nuevo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#1E3A5F',
                color: '#fff',
                borderRadius: 12,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <Plus size={16} />
              Registrar paciente
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            className="hema-cards-mobile"
          >
            {filtered.map((p) => (
              <PatientCard key={p.id} p={p} />
            ))}
          </div>

          {/* Desktop: tabla */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 16,
              overflow: 'hidden',
            }}
            className="hema-table-desktop"
          >
            {/* Cabecera */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.2fr 1fr 1.4fr',
                gap: 12,
                padding: '10px 20px',
                background: '#F9FAFB',
                borderBottom: '1px solid #E5E7EB',
              }}
            >
              {['Paciente', 'Edad / Sexo', 'Diagnóstico', 'Última indicación'].map((h) => (
                <p key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {h}
                </p>
              ))}
            </div>
            {filtered.map((p) => <PatientRow key={p.id} p={p} />)}
          </div>
        </>
      )}

      {/* Responsive: show cards on mobile, table on desktop */}
      <style>{`
        .hema-cards-mobile { display: flex; }
        .hema-table-desktop { display: none; }
        @media (min-width: 768px) {
          .hema-cards-mobile { display: none; }
          .hema-table-desktop { display: block; }
        }
      `}</style>

      {/* Counter badge */}
      {!loading && filtered.length > 0 && query && (
        <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{query}"
        </p>
      )}
    </>
  )
}

// ─── Export con Suspense (useSearchParams lo requiere) ──────────────────────

export default function PacientesPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <PacientesContent />
    </Suspense>
  )
}
