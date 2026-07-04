'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import {
  CheckCircle, XCircle, ToggleLeft, ToggleRight,
  Eye, EyeOff, AlertCircle, ChevronDown,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Medico {
  id: string
  full_name: string
  email: string
  specialty: string
  professional_license: string | null
  created_at: string
  review_status: 'pendiente' | 'revisado' | 'rechazado'
  is_active: boolean
}

type ReviewFilter = 'todos' | 'pendiente' | 'revisado' | 'rechazado'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function statusBadge(s: string) {
  if (s === 'revisado')  return { bg:'#ECFDF5', color:'#059669', border:'#D1FAE5', label:'Aprobado' }
  if (s === 'rechazado') return { bg:'#FEF2F2', color:'#DC2626', border:'#FEE2E2', label:'Rechazado' }
  return                        { bg:'#FFFBEB', color:'#D97706', border:'#FEF3C7', label:'Pendiente' }
}

// ── Componente principal ────────────────────────────────────────────────────────

export default function AdminMedicos() {
  const [autenticado, setAutenticado] = useState(false)
  const [passInput, setPassInput]     = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [passError, setPassError]     = useState(false)

  const [medicos, setMedicos]       = useState<Medico[]>([])
  const [loading, setLoading]       = useState(false)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [toast, setToast]           = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('todos')
  const [espFilter, setEspFilter]       = useState('todas')

  useEffect(() => {
    if (sessionStorage.getItem('salurama_admin') === 'true') setAutenticado(true)
  }, [])

  useEffect(() => { if (autenticado) cargarMedicos() }, [autenticado])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  // ── Data ────────────────────────────────────────────────────────────────────

  async function cargarMedicos() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, full_name, email, specialty, professional_license, created_at, review_status, is_active')
        .order('created_at', { ascending: false })
      if (error) throw error
      setMedicos(data || [])
    } catch {
      setToast({ msg: 'Error al cargar médicos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const especialidades = useMemo(() => {
    return Array.from(new Set(medicos.map(m => m.specialty).filter(Boolean))).sort()
  }, [medicos])

  const medicosVisibles = useMemo(() => {
    return medicos.filter(m => {
      if (reviewFilter !== 'todos' && m.review_status !== reviewFilter) return false
      if (espFilter !== 'todas' && m.specialty !== espFilter) return false
      return true
    })
  }, [medicos, reviewFilter, espFilter])

  // ── Acciones ────────────────────────────────────────────────────────────────

  async function setReviewStatus(m: Medico, status: 'revisado' | 'rechazado') {
    const label = status === 'revisado' ? `aprobar cédula de ${m.full_name}` : `rechazar a ${m.full_name}`
    if (!confirm(`¿Confirmas ${label}?`)) return
    setProcesando(m.id + '_review')
    try {
      const { error } = await supabase
        .from('doctors').update({ review_status: status }).eq('id', m.id)
      if (error) throw error
      setMedicos(prev => prev.map(x => x.id === m.id ? { ...x, review_status: status } : x))
      setToast({ msg: `${m.full_name} — ${status === 'revisado' ? 'cédula aprobada ✓' : 'rechazado'}`, type: 'success' })
    } catch {
      setToast({ msg: 'Error al actualizar. Revisa permisos RLS.', type: 'error' })
    } finally {
      setProcesando(null)
    }
  }

  async function toggleActivo(m: Medico) {
    setProcesando(m.id + '_activo')
    try {
      const { error } = await supabase
        .from('doctors').update({ is_active: !m.is_active }).eq('id', m.id)
      if (error) throw error
      setMedicos(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !x.is_active } : x))
      setToast({ msg: `${m.full_name} — ${!m.is_active ? 'activado' : 'desactivado'}`, type: 'success' })
    } catch {
      setToast({ msg: 'Error al actualizar estado', type: 'error' })
    } finally {
      setProcesando(null)
    }
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  async function login() {
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passInput }),
      })
      if (res.ok) {
        sessionStorage.setItem('salurama_admin', 'true')
        setAutenticado(true)
        setPassError(false)
      } else {
        setPassError(true)
        setPassInput('')
      }
    } catch {
      setToast({ msg: 'Error de conexión', type: 'error' })
    }
  }

  // ── Render: gate de login ────────────────────────────────────────────────────

  if (!autenticado) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#E8ECF3 0%,#F9FAFB 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;500;700&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ background:'#fff', borderRadius:20, padding:'clamp(28px,6vw,44px)', maxWidth:420, width:'100%', boxShadow:'0 16px 48px rgba(30,58,95,0.12)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ marginBottom:12 }}>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:32, fontWeight:900, color:'#1E3A5F' }}>Salu</span>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:32, fontWeight:600, color:'#2A9D8F' }}>rama</span>
          </div>
          <p style={{ fontSize:13, color:'#6B7280' }}>Administración · Médicos</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ position:'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Contraseña de administrador"
              value={passInput}
              onChange={e => { setPassInput(e.target.value); setPassError(false) }}
              onKeyDown={e => e.key === 'Enter' && login()}
              style={{ width:'100%', padding:'13px 44px 13px 16px', border:`1.5px solid ${passError ? '#DC2626' : '#E5E7EB'}`, borderRadius:10, fontSize:15, fontFamily:"'DM Sans',sans-serif", outline:'none', color:'#111827' }}
            />
            <button type="button" onClick={() => setShowPass(p => !p)}
              style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {passError && <p style={{ fontSize:13, color:'#DC2626', textAlign:'center' }}>Contraseña incorrecta</p>}
          <button onClick={login}
            style={{ width:'100%', background:'#1E3A5F', color:'#fff', border:'none', borderRadius:50, padding:'13px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Entrar
          </button>
          <Link href="/admin" style={{ textAlign:'center', fontSize:13, color:'#9CA3AF', textDecoration:'none' }}>← Admin principal</Link>
        </div>
      </div>
    </div>
  )

  // ── Render: panel ────────────────────────────────────────────────────────────

  const counts = {
    total:     medicos.length,
    pendiente: medicos.filter(m => m.review_status === 'pendiente').length,
    revisado:  medicos.filter(m => m.review_status === 'revisado').length,
    rechazado: medicos.filter(m => m.review_status === 'rechazado').length,
  }

  return (
    <>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999,
          background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          color:      toast.type === 'success' ? '#059669' : '#DC2626',
          border:    `1px solid ${toast.type === 'success' ? '#D1FAE5' : '#FEE2E2'}`,
          borderRadius:10, padding:'12px 18px', fontSize:13, fontWeight:500,
          display:'flex', alignItems:'center', gap:8,
          boxShadow:'0 4px 12px rgba(0,0,0,0.1)', pointerEvents:'none',
        }}>
          {toast.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      <div style={{ minHeight:'100vh', background:'#F9FAFB', fontFamily:"'DM Sans',sans-serif", color:'#111827' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .spin { animation: spin 0.7s linear infinite; display:inline-block; }
          .act-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 11px; border-radius:50px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid; font-family:'DM Sans',sans-serif; transition:opacity 0.15s; white-space:nowrap; }
          .act-btn:disabled { opacity:0.45; cursor:not-allowed; }
          .fpill { padding:7px 15px; border:1.5px solid; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
          .trow:hover td { background:#F9FAFB; }
          @media (max-width:900px) { .twrap { overflow-x:auto; } }
        `}</style>

        <div style={{ maxWidth:1240, margin:'0 auto', padding:'24px 16px 60px' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(20px,4vw,28px)', fontWeight:900, color:'#0D1829' }}>
                Médicos registrados
              </h1>
              <p style={{ fontSize:13, color:'#6B7280', marginTop:3 }}>
                {counts.total} en total · mostrando {medicosVisibles.length}
              </p>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button onClick={cargarMedicos}
                style={{ padding:'9px 18px', background:'#E8ECF3', color:'#1E3A5F', border:'1px solid #C5D0E0', borderRadius:50, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Actualizar
              </button>
              <Link href="/admin"
                style={{ padding:'9px 18px', background:'#1E3A5F', color:'#fff', borderRadius:50, fontSize:13, fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center' }}>
                ← Admin principal
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:24 }}>
            {([
              { label:'Total',      value:counts.total,     color:'#1E3A5F', bg:'#E8ECF3',  border:'#C5D0E0' },
              { label:'Pendientes', value:counts.pendiente, color:'#D97706', bg:'#FFFBEB',  border:'#FEF3C7' },
              { label:'Aprobados',  value:counts.revisado,  color:'#059669', bg:'#ECFDF5',  border:'#D1FAE5' },
              { label:'Rechazados', value:counts.rechazado, color:'#DC2626', bg:'#FEF2F2',  border:'#FEE2E2' },
            ] as const).map(s => (
              <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:14, padding:'16px 18px', textAlign:'center' }}>
                <p style={{ fontFamily:"'Fraunces',serif", fontSize:32, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</p>
                <p style={{ fontSize:12, color:s.color, fontWeight:600, marginTop:4, opacity:0.85 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
            {(['todos','pendiente','revisado','rechazado'] as const).map(f => {
              const active = reviewFilter === f
              const map = {
                todos:    { label:'Todos',                              onBg:'#1E3A5F', offBg:'#F9FAFB', offColor:'#1E3A5F', border:'#C5D0E0' },
                pendiente:{ label:`Pendientes (${counts.pendiente})`,  onBg:'#D97706', offBg:'#FFFBEB', offColor:'#D97706', border:'#FEF3C7' },
                revisado: { label:`Aprobados (${counts.revisado})`,    onBg:'#059669', offBg:'#ECFDF5', offColor:'#059669', border:'#D1FAE5' },
                rechazado:{ label:`Rechazados (${counts.rechazado})`,  onBg:'#DC2626', offBg:'#FEF2F2', offColor:'#DC2626', border:'#FEE2E2' },
              }[f]
              return (
                <button key={f} className="fpill" onClick={() => setReviewFilter(f)}
                  style={{ background: active ? map.onBg : map.offBg, color: active ? '#fff' : map.offColor, borderColor: map.border }}>
                  {map.label}
                </button>
              )
            })}

            <div style={{ position:'relative', marginLeft:'auto' }}>
              <select value={espFilter} onChange={e => setEspFilter(e.target.value)}
                style={{ appearance:'none', background:'#fff', border:'1.5px solid #C5D0E0', borderRadius:50, padding:'8px 36px 8px 16px', fontSize:13, fontWeight:600, color:'#1E3A5F', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                <option value="todas">Todas las especialidades</option>
                {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <ChevronDown size={14} color="#1E3A5F" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            </div>
          </div>

          {/* Tabla */}
          {loading ? (
            <div style={{ textAlign:'center', padding:64 }}>
              <div style={{ width:36, height:36, border:'3px solid #E8ECF3', borderTopColor:'#1E3A5F', borderRadius:'50%', margin:'0 auto 12px' }} className="spin" />
              <p style={{ color:'#9CA3AF', fontSize:14 }}>Cargando médicos...</p>
            </div>
          ) : medicosVisibles.length === 0 ? (
            <div style={{ textAlign:'center', padding:64, background:'#fff', borderRadius:16, border:'1px solid #E8ECF3' }}>
              <p style={{ fontSize:15, color:'#6B7280' }}>Sin médicos con ese filtro.</p>
            </div>
          ) : (
            <div className="twrap" style={{ background:'#fff', borderRadius:16, border:'1px solid #E8ECF3', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E8ECF3' }}>
                    {['Médico / Email','Especialidad','Cédula','Registro','Estado','Activo','Acciones'].map(h => (
                      <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {medicosVisibles.map((m, i) => {
                    const badge      = statusBadge(m.review_status)
                    const procReview = procesando === m.id + '_review'
                    const procActivo = procesando === m.id + '_activo'
                    const isLast     = i === medicosVisibles.length - 1
                    return (
                      <tr key={m.id} className="trow"
                        style={{ borderBottom: isLast ? 'none' : '1px solid #F3F4F6' }}>

                        {/* Médico */}
                        <td style={{ padding:'13px 16px' }}>
                          <p style={{ fontWeight:700, color:'#0D1829', marginBottom:2 }}>{m.full_name}</p>
                          <p style={{ fontSize:12, color:'#6B7280' }}>{m.email}</p>
                        </td>

                        {/* Especialidad */}
                        <td style={{ padding:'13px 16px', color:'#2A9D8F', fontWeight:600, whiteSpace:'nowrap' }}>
                          {m.specialty}
                        </td>

                        {/* Cédula */}
                        <td style={{ padding:'13px 16px' }}>
                          <code style={{ fontSize:13, background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:6, padding:'3px 8px', color:'#111827' }}>
                            {m.professional_license || '—'}
                          </code>
                        </td>

                        {/* Fecha */}
                        <td style={{ padding:'13px 16px', color:'#6B7280', whiteSpace:'nowrap' }}>
                          {formatFecha(m.created_at)}
                        </td>

                        {/* review_status */}
                        <td style={{ padding:'13px 16px' }}>
                          <span style={{ background:badge.bg, color:badge.color, border:`1px solid ${badge.border}`, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, display:'inline-block' }}>
                            {badge.label}
                          </span>
                        </td>

                        {/* is_active */}
                        <td style={{ padding:'13px 16px' }}>
                          <span style={{
                            background: m.is_active ? '#ECFDF5' : '#F3F4F6',
                            color:      m.is_active ? '#059669' : '#9CA3AF',
                            border:    `1px solid ${m.is_active ? '#D1FAE5' : '#E5E7EB'}`,
                            borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, display:'inline-block',
                          }}>
                            {m.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td style={{ padding:'13px 16px' }}>
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            {m.review_status !== 'revisado' && (
                              <button className="act-btn" disabled={procReview}
                                onClick={() => setReviewStatus(m, 'revisado')}
                                style={{ background:'#ECFDF5', color:'#059669', borderColor:'#D1FAE5' }}>
                                {procReview
                                  ? <span className="spin" style={{ width:12, height:12, border:'2px solid #05966940', borderTopColor:'#059669', borderRadius:'50%' }} />
                                  : <CheckCircle size={13} />}
                                Aprobar cédula
                              </button>
                            )}
                            {m.review_status !== 'rechazado' && (
                              <button className="act-btn" disabled={procReview}
                                onClick={() => setReviewStatus(m, 'rechazado')}
                                style={{ background:'#FEF2F2', color:'#DC2626', borderColor:'#FEE2E2' }}>
                                {procReview
                                  ? <span className="spin" style={{ width:12, height:12, border:'2px solid #DC262640', borderTopColor:'#DC2626', borderRadius:'50%' }} />
                                  : <XCircle size={13} />}
                                Rechazar
                              </button>
                            )}
                            <button className="act-btn" disabled={procActivo}
                              onClick={() => toggleActivo(m)}
                              style={{ background:'#E8ECF3', color:'#1E3A5F', borderColor:'#C5D0E0' }}>
                              {procActivo
                                ? <span className="spin" style={{ width:12, height:12, border:'2px solid #1E3A5F40', borderTopColor:'#1E3A5F', borderRadius:'50%' }} />
                                : m.is_active ? <ToggleRight size={13}/> : <ToggleLeft size={13}/>}
                              {m.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
