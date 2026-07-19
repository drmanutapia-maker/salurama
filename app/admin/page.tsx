'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import {
  CheckCircle, XCircle, Eye, EyeOff, ExternalLink, Copy,
  Shield, ToggleLeft, ToggleRight, GraduationCap, Calendar,
  FileText, AlertCircle
} from 'lucide-react'

const CEDULA_SEP_URL = 'https://www.cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action'

interface Medico {
  id: string
  full_name: string
  email: string
  specialty: string
  professional_license: string
  specialty_council?: string
  specialty_council_url?: string
  license_issue_date?: string
  sub_specialty?: string
  years_of_experience?: number
  review_status: 'pendiente' | 'revisado' | 'rechazado'
  license_visible: boolean
  is_active: boolean
  location_city: string
  phone: string
  created_at: string
  consultation_price: number
  admin_notes?: string
  last_reviewed_at?: string
  last_reviewed_by?: string
}

export default function AdminPanel() {
  const [autenticado, setAutenticado]   = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loginEmail, setLoginEmail]     = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPass, setShowPass]         = useState(false)
  const [loginError, setLoginError]     = useState('')
  const [loggingIn, setLoggingIn]       = useState(false)
  const [medicos, setMedicos]           = useState<Medico[]>([])
  const [loading, setLoading]           = useState(false)
  const [vista, setVista]               = useState<'pendientes' | 'todos'>('pendientes')
  const [copiado, setCopiado]           = useState<string | null>(null)
  const [procesando, setProcesando]     = useState<string | null>(null)
  const [adminEmail, setAdminEmail]     = useState('')
  const [toast, setToast]               = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [stats, setStats] = useState({
    pendientes: 0, revisados: 0, rechazados: 0, total: 0
  })

  // Cargar sesión real de Supabase al montar
  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: adminRow } = await supabase.from('admins').select('id').eq('user_id', user.id).maybeSingle()
        if (adminRow) {
          setAutenticado(true)
          setAdminEmail(user.email || '')
        }
      }
      setCheckingAuth(false)
    }
    checkSession()
  }, [])

  // Cargar médicos cuando cambia vista o autenticación
  useEffect(() => {
    if (autenticado) cargarMedicos()
  }, [autenticado, vista])

  // Auto-ocultar toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function cargarMedicos() {
    setLoading(true)
    try {
      // Stats
      const { data: todos } = await supabase.from('doctors').select('review_status')
      if (todos) {
        setStats({
          pendientes: todos.filter(m => m.review_status === 'pendiente').length,
          revisados:  todos.filter(m => m.review_status === 'revisado').length,
          rechazados: todos.filter(m => m.review_status === 'rechazado').length,
          total:      todos.length,
        })
      }
      // Lista
      let query = supabase.from('doctors').select('*').order('created_at', { ascending: false })
      if (vista === 'pendientes') query = query.eq('review_status', 'pendiente')
      const { data, error } = await query
      if (error) throw error
      setMedicos(data || [])
    } catch (e: unknown) {
      console.error('Error cargando médicos:', e)
      setToast({ msg: 'Error al cargar médicos. Intenta recargar.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function login() {
    setLoggingIn(true)
    setLoginError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
      if (error || !data.user) {
        setLoginError('Correo o contraseña incorrectos')
        return
      }
      const { data: adminRow } = await supabase.from('admins').select('id').eq('user_id', data.user.id).maybeSingle()
      if (!adminRow) {
        await supabase.auth.signOut()
        setLoginError('Esta cuenta no tiene permisos de administrador')
        return
      }
      setAutenticado(true)
      setAdminEmail(data.user.email || '')
      setToast({ msg: '¡Bienvenido al panel de administración!', type: 'success' })
    } catch {
      setLoginError('Error de conexión')
    } finally {
      setLoggingIn(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    setAutenticado(false)
    setAdminEmail('')
    setToast({ msg: 'Sesión cerrada', type: 'success' })
  }

  async function cambiarStatus(medico: Medico, nuevoStatus: 'revisado' | 'rechazado') {
    const accion = nuevoStatus === 'revisado'
      ? 'marcar cédula como consultable'
      : 'rechazar este perfil'
    
    if (!confirm(`¿Confirmas ${accion} para ${medico.full_name}?`)) return

    setProcesando(medico.id)
    try {
      const { error } = await supabase.from('doctors').update({
        review_status:    nuevoStatus,
        license_visible:  nuevoStatus === 'revisado',
        last_reviewed_at: new Date().toISOString(),
        last_reviewed_by: adminEmail || 'admin@salurama.com',
      }).eq('id', medico.id)
      
      if (error) throw error

      // ✅ ELIMINADO: Referencia a admin_actions (tabla no existe)
      // Si en el futuro creas la tabla, puedes agregarla aquí con try/catch separado

      await cargarMedicos()
      setToast({ 
        msg: `Perfil actualizado: ${nuevoStatus === 'revisado' ? 'Cédula consultable' : 'Rechazado'}`, 
        type: 'success' 
      })
    } catch (e: unknown) {
      console.error('Error actualizando médico:', e)
      setToast({ 
        msg: 'Error al actualizar. Verifica permisos en Supabase e intenta de nuevo.', 
        type: 'error' 
      })
    } finally {
      setProcesando(null)
    }
  }

  async function toggleActivo(medico: Medico) {
    setProcesando(medico.id + '_activo')
    try {
      const { error } = await supabase.from('doctors')
        .update({ is_active: !medico.is_active })
        .eq('id', medico.id)
      if (error) throw error
      await cargarMedicos()
      setToast({ 
        msg: `Médico ${!medico.is_active ? 'activado' : 'desactivado'}`, 
        type: 'success' 
      })
    } catch {
      setToast({ msg: 'Error al actualizar estado. Intenta de nuevo.', type: 'error' })
    } finally {
      setProcesando(null)
    }
  }

  function copiarCedula(cedula: string, id: string) {
    navigator.clipboard.writeText(cedula)
    setCopiado(id)
    setTimeout(() => setCopiado(null), 2000)
  }

  function formatFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  function statusColor(status: string) {
    if (status === 'revisado')  return { bg: '#ECFDF5', color: '#059669', border: '#D1FAE5', texto: 'Cédula consultable' }
    if (status === 'rechazado') return { bg: '#FEF2F2', color: '#DC2626', border: '#FEE2E2', texto: 'Rechazado' }
    return { bg: '#FFFBEB', color: '#D97706', border: '#FEF3C7', texto: 'Pendiente de revisión' }
  }

  function calcularExperiencia(licenseIssueDate?: string) {
    if (!licenseIssueDate) return 'No registrada'
    const anos = new Date().getFullYear() - new Date(licenseIssueDate).getFullYear()
    return `${anos} año${anos !== 1 ? 's' : ''}`
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (checkingAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%' }} />
    </div>
  )

  if (!autenticado) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #E8ECF3 0%, #F9FAFB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;500;700&display=swap'); *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ background: '#fff', borderRadius: 20, padding: 'clamp(28px, 6vw, 44px)', maxWidth: 420, width: '100%', boxShadow: '0 16px 48px rgba(30,58,95,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 900, color: '#1E3A5F' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 600, color: '#2A9D8F' }}>rama</span>
          </div>
          <p style={{ fontSize: 13, color: '#6B7280' }}>Panel de Administración</p>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Acceso restringido</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email"
            placeholder="Correo de administrador"
            value={loginEmail}
            onChange={e => { setLoginEmail(e.target.value); setLoginError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '13px 16px', border: `1.5px solid ${loginError ? '#DC2626' : '#E5E7EB'}`, borderRadius: 10, fontSize: 15, fontFamily: "'DM Sans', sans-serif", color: '#111827', outline: 'none' }}
          />
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Contraseña"
              value={loginPassword}
              onChange={e => { setLoginPassword(e.target.value); setLoginError('') }}
              onKeyDown={e => e.key === 'Enter' && login()}
              style={{ width: '100%', padding: '13px 44px 13px 16px', border: `1.5px solid ${loginError ? '#DC2626' : '#E5E7EB'}`, borderRadius: 10, fontSize: 15, fontFamily: "'DM Sans', sans-serif", color: '#111827', outline: 'none' }}
            />
            <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {loginError && <p style={{ fontSize: 13, color: '#DC2626', textAlign: 'center' }}>{loginError}</p>}
          <button onClick={login} disabled={loggingIn} style={{ width: '100%', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 50, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: loggingIn ? 0.6 : 1, transition: 'background 0.18s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1A3254'}
            onMouseLeave={e => e.currentTarget.style.background = '#1E3A5F'}>
            {loggingIn ? 'Entrando...' : 'Entrar al panel'}
          </button>
          <Link href="/" style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )

  // ── PANEL ──────────────────────────────────────────────────────────────────
  return (
    <>
    {/* TOAST — overlay global, no reemplaza el panel */}
    {toast && (
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
        color: toast.type === 'success' ? '#059669' : '#DC2626',
        border: `1px solid ${toast.type === 'success' ? '#D1FAE5' : '#FEE2E2'}`,
        borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 500,
        display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        animation: 'slideIn 0.3s ease-out', pointerEvents: 'none'
      }}>
        {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        {toast.msg}
        <style>{`@keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }`}</style>
      </div>
    )}
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .btn-ok { display:inline-flex; align-items:center; gap:6px; background:#ECFDF5; color:#059669; border:1px solid #D1FAE5; border-radius:50px; padding:7px 14px; font-size:13px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; }
        .btn-ok:hover { background:#059669; color:#fff; border-color:#059669; }
        .btn-no { display:inline-flex; align-items:center; gap:6px; background:#FEF2F2; color:#DC2626; border:1px solid #FEE2E2; border-radius:50px; padding:7px 14px; font-size:13px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; }
        .btn-no:hover { background:#DC2626; color:#fff; border-color:#DC2626; }
        .btn-sep { display:inline-flex; align-items:center; gap:6px; background:#E8ECF3; color:#1E3A5F; border:1px solid #C5D0E0; border-radius:50px; padding:7px 14px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; }
        .btn-sep:hover { background:#1E3A5F; color:#fff; }
        .mcard { background:#fff; border-radius:14px; border:1px solid #E5E7EB; padding:20px; margin-bottom:14px; transition:box-shadow 0.18s; }
        .mcard:hover { box-shadow:0 4px 16px rgba(30,58,95,0.08); }
        .tab-btn { padding:9px 20px; border:none; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; }
        .tab-btn.on { background:#1E3A5F; color:#fff; }
        .tab-btn.off { background:#F3F4F6; color:#6B7280; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { animation:spin 0.7s linear infinite; }
        @media (max-width:640px) {
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .mcard-flex { flex-direction:column !important; }
          .acciones-col { flex-direction:column !important; gap:8px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* INSTRUCCIONES */}
        <div style={{ background: '#E8ECF3', border: '1px solid #C5D0E0', borderRadius: 12, padding: '16px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Shield size={18} color="#1E3A5F" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 8 }}>
              Proceso de revisión — narrativa Salurama
            </p>
            <ol style={{ fontSize: 13, color: '#374151', lineHeight: 1.75, paddingLeft: 20, margin: 0 }}>
              <li>Copia el número de cédula del médico</li>
              <li>Abre el <a href={CEDULA_SEP_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#1E3A5F', fontWeight: 600 }}>portal de la SEP</a> y búscala</li>
              <li><strong>Si coincide con nombre y especialidad:</strong> marca "Cédula consultable" — esto significa que el paciente podrá confirmarla desde el perfil</li>
              <li><strong>Si no coincide o no existe:</strong> rechazar</li>
            </ol>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10, fontStyle: 'italic', margin: '10px 0 12px' }}>
              Recuerda: Salurama no verifica, solo facilita el acceso. "Cédula consultable" = el número que el médico declaró existe en SEP al momento de la revisión.
            </p>
            <button onClick={() => window.open(CEDULA_SEP_URL, '_blank')} className="btn-sep">
              <ExternalLink size={14} /> Abrir portal SEP →
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total registrados', value: stats.total,      color: '#1E3A5F', bg: '#E8ECF3' },
            { label: 'Pendientes',        value: stats.pendientes,  color: '#D97706', bg: '#FEF3C7' },
            { label: 'Cédula consultable',value: stats.revisados,   color: '#059669', bg: '#ECFDF5' },
            { label: 'Rechazados',        value: stats.rechazados,  color: '#DC2626', bg: '#FEF2F2' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '16px 18px', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: s.color, fontWeight: 500, marginTop: 4, opacity: 0.8 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: '#111827' }}>
            {vista === 'pendientes' ? 'Pendientes de revisión' : 'Todos los médicos'}
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={`tab-btn ${vista === 'pendientes' ? 'on' : 'off'}`} onClick={() => setVista('pendientes')}>
              Pendientes {stats.pendientes > 0 && `(${stats.pendientes})`}
            </button>
            <button className={`tab-btn ${vista === 'todos' ? 'on' : 'off'}`} onClick={() => setVista('todos')}>
              Todos
            </button>
            <Link href="/admin/medicos"
              style={{ padding:'9px 20px', background:'#E8ECF3', color:'#1E3A5F', border:'none', borderRadius:50, fontSize:13, fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center' }}>
              Panel de médicos →
            </Link>
            <button onClick={logout}
              style={{ padding:'9px 20px', background:'#FEF2F2', color:'#DC2626', border:'none', borderRadius:50, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* LISTA */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #E8ECF3', borderTopColor: '#1E3A5F', borderRadius: '50%', margin: '0 auto 12px' }} className="spin" />
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando médicos...</p>
          </div>
        ) : medicos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🎉</p>
            <p style={{ fontSize: 16, color: '#374151', fontWeight: 700, fontFamily: "'Fraunces', serif" }}>
              {vista === 'pendientes' ? '¡Sin pendientes por revisar!' : 'No hay médicos registrados aún'}
            </p>
          </div>
        ) : (
          medicos.map(m => {
            const sc              = statusColor(m.review_status)
            const esProcesando    = procesando === m.id
            const esProcesandoAct = procesando === m.id + '_activo'
            return (
              <div key={m.id} className="mcard">
                <div className="mcard-flex" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                  {/* Avatar */}
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#1E3A5F,#2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                    {(m.full_name?.[0] || '?').toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <p style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 900, color: '#111827' }}>{m.full_name}</p>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
                        {sc.texto}
                      </span>
                      {!m.is_active && (
                        <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>Inactivo</span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: '#1E3A5F', fontWeight: 600, marginBottom: 6 }}>{m.specialty}</p>
                    {m.sub_specialty && <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>📌 {m.sub_specialty}</p>}
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                      <span>📧 {m.email}</span>
                      {m.phone && <span>📱 {m.phone}</span>}
                      {m.location_city && <span>📍 {m.location_city}</span>}
                      {m.years_of_experience && <span>🎓 {m.years_of_experience} años exp.</span>}
                      <span>🗓 {formatFecha(m.created_at)}</span>
                    </div>

                    {/* Cédula */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px' }}>
                        <FileText size={14} color="#9CA3AF" />
                        <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Cédula:</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '0.05em' }}>{m.professional_license || 'No registrada'}</span>
                        {m.professional_license && (
                          <button onClick={() => copiarCedula(m.professional_license, m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiado === m.id ? '#059669' : '#9CA3AF', padding: 2, display: 'flex', alignItems: 'center' }}>
                            {copiado === m.id ? <CheckCircle size={15} /> : <Copy size={15} />}
                          </button>
                        )}
                      </div>
                      {copiado === m.id && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>¡Copiada!</span>}
                    </div>

                    {/* Consejo de especialidad */}
                    {m.specialty_council && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                        <GraduationCap size={14} color="#9CA3AF" />
                        <span>{m.specialty_council}</span>
                        {m.specialty_council_url && (
                          <a href={m.specialty_council_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1E3A5F', display: 'flex' }}>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Fecha cédula */}
                    {m.license_issue_date && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#6B7280' }}>
                        <Calendar size={14} color="#9CA3AF" />
                        <span>Expedición: {new Date(m.license_issue_date).toLocaleDateString('es-MX')}</span>
                        <span style={{ color: '#1E3A5F', fontWeight: 600 }}>({calcularExperiencia(m.license_issue_date)})</span>
                      </div>
                    )}

                    {/* Notas */}
                    {m.admin_notes && (
                      <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 8, padding: 10, marginTop: 10, fontSize: 12, color: '#B45309' }}>
                        <AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
                        {m.admin_notes}
                      </div>
                    )}

                    {/* Última revisión */}
                    {m.last_reviewed_at && (
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                        Revisado por {m.last_reviewed_by || 'admin'} el {formatFecha(m.last_reviewed_at)}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="acciones-col" style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    {m.review_status !== 'revisado' && (
                      <button className="btn-ok" onClick={() => cambiarStatus(m, 'revisado')} disabled={!!esProcesando}>
                        {esProcesando
                          ? <span style={{ width: 14, height: 14, border: '2px solid #05966944', borderTopColor: '#059669', borderRadius: '50%' }} className="spin" />
                          : <CheckCircle size={14} />
                        }
                        Cédula consultable
                      </button>
                    )}
                    {m.review_status !== 'rechazado' && (
                      <button className="btn-no" onClick={() => cambiarStatus(m, 'rechazado')} disabled={!!esProcesando}>
                        {esProcesando
                          ? <span style={{ width: 14, height: 14, border: '2px solid #DC262644', borderTopColor: '#DC2626', borderRadius: '50%' }} className="spin" />
                          : <XCircle size={14} />
                        }
                        Rechazar
                      </button>
                    )}
                    <button className="btn-sep" onClick={() => toggleActivo(m)} disabled={!!esProcesandoAct} style={{ justifyContent: 'center' }}>
                      {esProcesandoAct
                        ? <span style={{ width: 14, height: 14, border: '2px solid #1E3A5F44', borderTopColor: '#1E3A5F', borderRadius: '50%' }} className="spin" />
                        : m.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />
                      }
                      {m.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <Link href={`/doctor/${m.id}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 50, padding: '7px 14px', fontSize: 13, fontWeight: 500, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                      <ExternalLink size={13} /> Ver perfil
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
    </>
  )
}