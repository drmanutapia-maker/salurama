'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { FlaskConical, Plus, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LabPanelListRow {
  id: string
  patient_id: string
  patient_name: string
  collected_at: string
  source: string
  reviewed_by: string | null
  value_count: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

const SOURCE_LABEL: Record<string, string> = { manual: 'Manual', ocr: 'OCR', fhir: 'FHIR' }

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F3F4F6' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 14, background: '#F3F4F6', borderRadius: 6, width: '50%' }} />
        <div style={{ height: 12, background: '#F3F4F6', borderRadius: 6, width: '30%' }} />
      </div>
    </div>
  )
}

// ─── Panel Card ──────────────────────────────────────────────────────────────

function PanelCard({ p }: { p: LabPanelListRow }) {
  const reviewed = p.reviewed_by !== null
  return (
    <Link
      href={`/hema/pacientes/${p.patient_id}`}
      style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16,
        display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', minHeight: 76,
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 10, background: 'rgba(124,58,237,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <FlaskConical size={18} color="#7C3AED" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.patient_name || '—'}
        </p>
        <p style={{ fontSize: 12, color: '#6B7280' }}>
          {formatDate(p.collected_at)} · {p.value_count} valor{p.value_count !== 1 ? 'es' : ''} · {SOURCE_LABEL[p.source] ?? p.source}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          {reviewed ? (
            <>
              <CheckCircle2 size={12} color="#16A34A" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A' }}>Revisado</span>
            </>
          ) : (
            <>
              <Clock size={12} color="#D97706" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706' }}>Pendiente de revisión</span>
            </>
          )}
        </div>
      </div>

      <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabsPage() {
  const router = useRouter()
  const [panels, setPanels] = useState<LabPanelListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login?next=/hema/labs'); return }

      const { data, error: rpcError } = await supabase.rpc('hema_list_recent_lab_panels', { p_limit: 30 })

      if (!mounted) return
      if (rpcError) { setError(rpcError.message); setLoading(false); return }
      setPanels((data as LabPanelListRow[]) ?? [])
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [router])

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: '#1E3A5F', marginBottom: 2 }}>
            Labs
          </h1>
          {!loading && (
            <p style={{ fontSize: 13, color: '#6B7280' }}>
              {panels.length} panel{panels.length !== 1 ? 'es' : ''} reciente{panels.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <Link
          href="/hema/pacientes?labs=true"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#7C3AED', color: '#fff', borderRadius: 12, padding: '12px 20px',
            fontSize: 14, fontWeight: 700, textDecoration: 'none', minHeight: 48,
            boxShadow: '0 2px 6px rgba(124,58,237,0.3)',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Nuevo panel
        </Link>
      </div>

      {/* ─── Contenido ──────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>Error al cargar laboratorios</p>
            <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
          </div>
        </div>
      ) : panels.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <FlaskConical size={40} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
            Sin laboratorios registrados
          </p>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>
            Sube el primer panel de labs de un paciente para verlo aquí
          </p>
          <Link
            href="/hema/pacientes?labs=true"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#7C3AED', color: '#fff', borderRadius: 12, padding: '12px 24px',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}
          >
            <Plus size={16} />
            Subir labs
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {panels.map((p) => <PanelCard key={p.id} p={p} />)}
        </div>
      )}
    </>
  )
}
