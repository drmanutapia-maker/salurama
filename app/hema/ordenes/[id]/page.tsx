'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import {
  ArrowLeft, AlertCircle, AlertTriangle, CheckCircle2, Download,
  FileText, Loader2, ShieldAlert, ShieldCheck,
} from 'lucide-react'
import { formatRoute } from '@salurama/hema-shared'
import { generateOrderPdf, signOrder } from './actions'

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderDetailDrug {
  inn: string
  route: string
  given_on_day: number
  computed_dose_mg: number
  base_dose_mg: number
  reduction_pct: number
  reduction_reason: string | null
  infusion_minutes: number | null
  vehicle: string | null
  override_reason: string | null
}

interface OrderDetailSignature {
  signer_name: string | null
  psc_provider: string
  signed_at: string
}

interface OrderDetail {
  id: string
  status: string
  cycle_number: number
  day_of_cycle: number
  scheduled_for: string
  next_cycle_date: string | null
  bsa_used: number
  bsa_formula: 'mosteller' | 'dubois'
  ecog: number | null
  disclaimer: string
  created_at: string
  pdf_path: string | null
  pdf_sha256: string | null
  tenant_name: string
  tenant_code: string | null
  patient_id: string
  patient_curp: string
  patient_display_name: string
  patient_birth_date: string
  patient_sex: 'M' | 'F'
  patient_allergies: string | null
  patient_expediente_sequential: number | null
  patient_weight_kg: number | null
  patient_height_cm: number | null
  diagnosis_code: string
  diagnosis_desc: string | null
  protocol_code: string
  protocol_name: string
  protocol_cycle_length_days: number
  protocol_total_cycles: number | null
  created_by_name: string | null
  created_by_license: string | null
  drugs: OrderDetailDrug[]
  signatures: OrderDetailSignature[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}
function calcAge(birthDate: string): number {
  const today = new Date()
  const born = new Date(birthDate)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}
function formatExpediente(tenantCode: string | null, sequential: number | null): string {
  if (sequential == null) return 'Sin expediente'
  const num = String(sequential).padStart(6, '0')
  return tenantCode ? `${tenantCode}-${num}` : num
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#9CA3AF', validated: '#D97706', signed: '#16A34A',
  dispensed: '#1E3A5F', administered: '#2A9D8F', cancelled: '#DC2626',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', validated: 'Por firmar', signed: 'Firmada',
  dispensed: 'Dispensada', administered: 'Administrada', cancelled: 'Cancelada',
}

const ALLOWED_SIGN_ROLES = ['medico', 'director_medico']

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [pdfPending, startPdfTransition] = useTransition()
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [viewingPdf, setViewingPdf] = useState(false)

  const [confirmSign, setConfirmSign] = useState(false)
  const [signPending, startSignTransition] = useTransition()
  const [signError, setSignError] = useState<string | null>(null)

  async function loadOrder() {
    const { data, error } = await supabase.rpc('hema_get_order_detail', { p_order_id: orderId })
    if (error) { setLoadError(error.message); setLoading(false); return }
    const rows = data as OrderDetail[]
    if (!rows || rows.length === 0) { setLoadError('Indicación no encontrada.'); setLoading(false); return }
    setOrder(rows[0])
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace(`/login?next=/hema/ordenes/${orderId}`); return }
      const { data: roleData } = await supabase.rpc('hema_get_my_role')
      if (!mounted) return
      setRole((roleData as string) ?? null)
      await loadOrder()
    }
    init()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, router])

  function handleGeneratePdf() {
    setPdfError(null)
    startPdfTransition(async () => {
      const result = await generateOrderPdf(orderId)
      if (result.success) {
        await loadOrder()
        window.open(result.pdfUrl, '_blank')
      } else {
        setPdfError(result.error)
      }
    })
  }

  async function handleViewPdf() {
    if (!order?.pdf_path) return
    setViewingPdf(true)
    setPdfError(null)
    const { data, error } = await supabase.storage.from('hema-order-pdfs').createSignedUrl(order.pdf_path, 300)
    setViewingPdf(false)
    if (error || !data) { setPdfError('No se pudo abrir el PDF.'); return }
    window.open(data.signedUrl, '_blank')
  }

  function handleSign() {
    setSignError(null)
    startSignTransition(async () => {
      const result = await signOrder(orderId)
      if (result.success) {
        await loadOrder()
        setConfirmSign(false)
      } else {
        setSignError(result.error)
      }
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (loadError || !order) {
    return (
      <div style={{ padding: 20 }}>
        <Link href="/hema/pacientes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={16} /> Pacientes
        </Link>
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 20, display: 'flex', gap: 12 }}>
          <AlertCircle size={20} color="#DC2626" />
          <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 600 }}>{loadError ?? 'Indicación no encontrada.'}</p>
        </div>
      </div>
    )
  }

  const needsPdfBeforeSign = order.signatures.length === 0 && !order.pdf_sha256
  const canRegeneratePdf = order.status === 'draft' || order.status === 'validated'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <Link
        href={`/hema/pacientes/${order.patient_id}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 16, minHeight: 44 }}
      >
        <ArrowLeft size={16} /> {order.patient_display_name}
      </Link>

      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: '#1E3A5F' }}>
          {order.protocol_code} · Ciclo {order.cycle_number}
        </h1>
        <span style={{
          fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '4px 10px', whiteSpace: 'nowrap',
          background: `${STATUS_COLOR[order.status] ?? '#9CA3AF'}18`, color: STATUS_COLOR[order.status] ?? '#9CA3AF',
        }}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>
      <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>
        Folio {order.id.slice(0, 8).toUpperCase()} · {order.tenant_name}
      </p>

      {/* Banner: indicación sin firmar más de 7 días desde scheduled_for */}
      {['draft', 'validated'].includes(order.status) && (() => {
        const days = Math.floor((Date.now() - new Date(order.scheduled_for).getTime()) / 86400000)
        if (days <= 7) return null
        return (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 14, display: 'flex', gap: 10 }}>
            <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#92400E', fontWeight: 600, margin: 0 }}>
              Esta indicación lleva {days} día{days !== 1 ? 's' : ''} sin firmar. Verifica que los datos clínicos sigan vigentes.
            </p>
          </div>
        )
      })()}

      {/* ── Paciente ── */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)', borderRadius: 16, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Paciente
        </p>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 900, marginBottom: 4, color: '#fff' }}>
          {order.patient_display_name}
        </h3>
        <p style={{ fontSize: 12, color: '#A0BBCC', fontFamily: 'monospace', marginBottom: 4 }}>
          Exp. {formatExpediente(order.tenant_code, order.patient_expediente_sequential)}
        </p>
        <p style={{ fontSize: 13, color: '#A0BBCC' }}>
          {calcAge(order.patient_birth_date)} años · {order.patient_sex === 'F' ? 'Femenino' : 'Masculino'} · {order.diagnosis_code} · {order.diagnosis_desc}
        </p>
        <p style={{ fontSize: 13, color: '#7EA8C9', marginTop: 8 }}>
          {order.patient_weight_kg != null && order.patient_height_cm != null
            ? `Peso ${order.patient_weight_kg} kg · Talla ${order.patient_height_cm} cm · `
            : ''}
          BSA {order.bsa_used.toFixed(2)} m² ({order.bsa_formula === 'mosteller' ? 'Mosteller' : 'DuBois'})
          {order.ecog !== null ? ` · ECOG ${order.ecog}` : ''} · Ciclo {order.cycle_number} · {formatDate(order.scheduled_for)}
        </p>
        {order.next_cycle_date && (
          <p style={{ fontSize: 12, color: '#7EA8C9', marginTop: 4 }}>
            Próximo ciclo: {formatDate(order.next_cycle_date)}
          </p>
        )}
        {order.patient_allergies ? (
          <p style={{ fontSize: 12, color: '#FEF9C3', marginTop: 8 }}>⚠ Alergias: {order.patient_allergies}</p>
        ) : (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 8 }}>ALERGIAS: Ninguna conocida</p>
        )}
      </div>

      {/* ── Fármacos ── */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 900, color: '#111827' }}>Fármacos indicados</h2>
        </div>
        {order.drugs.map((drug, i) => {
          const wasReduced = drug.computed_dose_mg !== drug.base_dose_mg
          return (
            <div key={`${drug.inn}-${drug.given_on_day}-${i}`} style={{ padding: '12px 16px', borderBottom: i < order.drugs.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{drug.inn}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{formatRoute(drug.route)} · Día {drug.given_on_day}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: wasReduced ? '#D97706' : '#1E3A5F', margin: 0 }}>
                    {drug.computed_dose_mg} mg
                  </p>
                  {wasReduced && (
                    <p style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>{drug.reduction_pct}% reducción</p>
                  )}
                </div>
              </div>
              {drug.override_reason && (
                <p style={{ fontSize: 11, color: '#B91C1C', marginTop: 6 }}>Justificación: {drug.override_reason}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Disclaimer NOM-004 ── */}
      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5, margin: 0 }}>{order.disclaimer}</p>
      </div>

      {/* ── PDF NOM-004 ── */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 900, color: '#111827', marginBottom: 10 }}>
          Documento PDF
        </h2>

        {pdfError && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, display: 'flex', gap: 8 }}>
            <AlertCircle size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, margin: 0 }}>{pdfError}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {order.pdf_path && (
            <button
              onClick={handleViewPdf}
              disabled={viewingPdf}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px',
                background: '#fff', border: '1.5px solid #1E3A5F', color: '#1E3A5F',
                borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: viewingPdf ? 'wait' : 'pointer', minHeight: 48,
              }}
            >
              {viewingPdf ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={16} />}
              Ver PDF
            </button>
          )}
          {canRegeneratePdf && (
            <button
              onClick={handleGeneratePdf}
              disabled={pdfPending}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px',
                background: pdfPending ? '#9CA3AF' : '#1E3A5F', color: '#fff', border: 'none',
                borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: pdfPending ? 'wait' : 'pointer', minHeight: 48,
              }}
            >
              {pdfPending ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileText size={16} />}
              {order.pdf_path ? 'Regenerar PDF' : 'Generar PDF'}
            </button>
          )}
        </div>
      </div>

      {/* ── Firma NOM-151 ── */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 900, color: '#111827', marginBottom: 10 }}>
          Firma electrónica
        </h2>

        {order.signatures.length > 0 ? (
          order.signatures.map((sig, i) => (
            <div key={i} style={{ marginBottom: i < order.signatures.length - 1 ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="#16A34A" />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
                  {sig.signer_name ?? 'Médico'} · {formatDateTime(sig.signed_at)}
                </p>
              </div>
              {sig.psc_provider === 'dev' ? (
                <p style={{ fontSize: 12, color: '#B91C1C', fontWeight: 700, marginTop: 4, marginLeft: 24 }}>
                  ⚠ FIRMA DE PRUEBA: no válida ante NOM-151
                </p>
              ) : (
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, marginLeft: 24 }}>{sig.psc_provider.toUpperCase()}</p>
              )}
            </div>
          ))
        ) : needsPdfBeforeSign ? (
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>Genera el PDF de la indicación antes de firmar.</p>
        ) : !ALLOWED_SIGN_ROLES.includes(role ?? '') ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <ShieldAlert size={16} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Pendiente de firma. Solo médicos pueden firmar.</p>
          </div>
        ) : order.status !== 'validated' ? (
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>La orden debe estar validada para poder firmarse.</p>
        ) : (
          <>
            <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, display: 'flex', gap: 8 }}>
              <AlertTriangle size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#991B1B', fontWeight: 600, margin: 0 }}>
                Modo de prueba: esta firma registra quién y cuándo, pero NO es una firma electrónica avanzada NOM-151 válida (sin PSC acreditado conectado).
              </p>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, cursor: 'pointer', marginBottom: 12, minHeight: 56 }}>
              <input
                type="checkbox"
                checked={confirmSign}
                onChange={(e) => setConfirmSign(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: '#1E3A5F', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
              />
              <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                Confirmo que soy el médico responsable de esta indicación y entiendo que esta es una firma de prueba, no válida ante NOM-151.
              </span>
            </label>

            {signError && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, display: 'flex', gap: 8 }}>
                <AlertCircle size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, margin: 0 }}>{signError}</p>
              </div>
            )}

            <button
              onClick={handleSign}
              disabled={!confirmSign || signPending}
              style={{
                width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: !confirmSign || signPending ? '#9CA3AF' : '#16A34A', color: '#fff', border: 'none',
                borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: !confirmSign || signPending ? 'not-allowed' : 'pointer', minHeight: 52,
              }}
            >
              {signPending ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <ShieldCheck size={16} />}
              Firmar (modo prueba)
            </button>
          </>
        )}

        {order.created_by_name && (
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 14 }}>
            Médico tratante: {order.created_by_name}{order.created_by_license ? ` · Cédula ${order.created_by_license}` : ''}
          </p>
        )}
      </div>

      <p style={{ fontSize: 11, color: '#D1D5DB', textAlign: 'center', marginTop: 8 }}>
        Creada el {formatDate(order.created_at)}
      </p>
    </>
  )
}
