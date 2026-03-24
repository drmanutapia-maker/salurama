'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { CheckCircle, XCircle, Eye, EyeOff, LogOut, ExternalLink, Copy, Users, Clock, Shield, ToggleLeft, ToggleRight } from 'lucide-react'

const ADMIN_PASSWORD = 'Oasis2187!'
const CEDULA_SEP_URL = 'https://www.cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action'

interface Medico {
  id: string
  full_name: string
  email: string
  specialty: string
  professional_license: string
  verification_status: 'pendiente' | 'verificado' | 'rechazado' | 'revision_manual'
  license_verified: boolean
  is_active: boolean
  location_city: string
  phone: string
  created_at: string
  consultation_price: number
}

export default function AdminPanel() {
  const [autenticado, setAutenticado]   = useState(false)
  const [passInput, setPassInput]       = useState('')
  const [showPass, setShowPass]         = useState(false)
  const [passError, setPassError]       = useState(false)
  const [medicos, setMedicos]           = useState<Medico[]>([])
  const [loading, setLoading]           = useState(false)
  const [vista, setVista]               = useState<'pendientes' | 'todos'>('pendientes')
  const [copiado, setCopiado]           = useState<string | null>(null)
  const [procesando, setProcesando]     = useState<string | null>(null)
  const [stats, setStats]               = useState({ pendientes: 0, verificados: 0, rechazados: 0, total: 0 })

  useEffect(() => {
    const ok = sessionStorage.getItem('salurama_admin')
    if (ok === 'true') setAutenticado(true)
  }, [])

  useEffect(() => {
    if (autenticado) cargarMedicos()
  }, [autenticado, vista])

  async function cargarMedicos() {
    setLoading(true)
    try {
      // Stats generales
      const { data: todos } = await supabase.from('doctors').select('verification_status')
      if (todos) {
        setStats({
          pendientes:  todos.filter(m => m.verification_status === 'pendiente').length,
          verificados: todos.filter(m => m.verification_status === 'verificado').length,
          rechazados:  todos.filter(m => m.verification_status === 'rechazado').length,
          total:       todos.length,
        })
      }

      // Lista según vista
      let query = supabase.from('doctors').select('*').order('created_at', { ascending: false })
      if (vista === 'pendientes') {
        query = query.eq('verification_status', 'pendiente')
      }
      const { data } = await query
      setMedicos(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function login() {
    if (passInput === ADMIN_PASSWORD) {
      sessionStorage.setItem('salurama_admin', 'true')
      setAutenticado(true)
      setPassError(false)
    } else {
      setPassError(true)
      setPassInput('')
    }
  }

  function logout() {
    sessionStorage.removeItem('salurama_admin')
    setAutenticado(false)
    setPassInput('')
  }

  async function cambiarStatus(
    medico: Medico,
    nuevoStatus: 'verificado' | 'rechazado',
  ) {
    setProcesando(medico.id)
    try {
      const verificado = nuevoStatus === 'verificado'
      const { error } = await supabase.from('doctors').update({
        verification_status: nuevoStatus,
        license_verified: verificado,
      }).eq('id', medico.id)
      if (error) throw error
      await cargarMedicos()
    } catch (e) {
      alert('Error al actualizar. Intenta de nuevo.')
    } finally {
      setProcesando(null)
    }
  }

  async function toggleActivo(medico: Medico) {
    setProcesando(medico.id + '_activo')
    try {
      const { error } = await supabase.from('doctors').update({
        is_active: !medico.is_active
      }).eq('id', medico.id)
      if (error) throw error
      await cargarMedicos()
    } catch (e) {
      alert('Error al actualizar. Intenta de nuevo.')
    } finally {
      setProcesando(null)
    }
  }

  function copiarCedula(cedula: string, id: string) {
    navigator.clipboard.writeText(cedula)
    setCopiado(id)
    setTimeout(() => setCopiado(null), 2000)
  }

  function abrirSEP() {
    window.open(CEDULA_SEP_URL, '_blank')
  }

  function formatFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  function statusColor(status: string) {
    if (status === 'verificado') return { bg: '#DCFCE7', color: '#059669', border: '#86EFAC' }
    if (status === 'rechazado')  return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' }
    return { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' }
  }

  // ── LOGIN ─────────────────────────────────────────────────
  if (!autenticado) return (
    <div style={{ minHeight: '100vh', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;500;700&display=swap'); *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ background: '#fff', borderRadius: 20, padding: 'clamp(28px, 6vw, 44px)', maxWidth: 400, width: '100%', boxShadow: '0 16px 48px rgba(55,48,163,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#3730A3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={26} color="#fff" />
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#3730A3', marginBottom: 4 }}>Panel de Admin</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>Salurama · Acceso restringido</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Contraseña de administrador"
              value={passInput}
              onChange={e => { setPassInput(e.target.value); setPassError(false) }}
              onKeyDown={e => e.key === 'Enter' && login()}
              style={{ width: '100%', padding: '13px 44px 13px 16px', border: '1.5px solid ' + (passError ? '#DC2626' : '#E5E7EB'), borderRadius: 10, fontSize: 15, fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', outline: 'none' }}
            />
            <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {passError && (
            <p style={{ fontSize: 13, color: '#DC2626', textAlign: 'center' }}>Contraseña incorrecta</p>
          )}

          <button onClick={login} style={{ width: '100%', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 50, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Entrar al panel
          </button>

          <Link href="/" style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )

  // ── PANEL ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .btn-ok  { display:inline-flex; align-items:center; gap:6px; background:#DCFCE7; color:#059669; border:1px solid #86EFAC; border-radius:50px; padding:7px 14px; font-size:13px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; }
        .btn-ok:hover  { background:#059669; color:#fff; border-color:#059669; }
        .btn-no  { display:inline-flex; align-items:center; gap:6px; background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; border-radius:50px; padding:7px 14px; font-size:13px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; }
        .btn-no:hover  { background:#DC2626; color:#fff; border-color:#DC2626; }
        .btn-sep { display:inline-flex; align-items:center; gap:6px; background:#EEF2FF; color:#3730A3; border:1px solid #C7D2FE; border-radius:50px; padding:7px 14px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; }
        .btn-sep:hover { background:#3730A3; color:#fff; }
        .mcard { background:#fff; border-radius:14px; border:1px solid #E5E7EB; padding:20px; margin-bottom:14px; transition:box-shadow 0.18s; }
        .mcard:hover { box-shadow:0 4px 16px rgba(55,48,163,0.08); }
        .tab-btn { padding:9px 20px; border:none; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; }
        .tab-btn.on  { background:#3730A3; color:#fff; }
        .tab-btn.off { background:#F3F4F6; color:#6B7280; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { animation:spin 0.7s linear infinite; }
      `}</style>

      {/* NAV */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#3730A3' }}>Salu</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
            </Link>
            <span style={{ fontSize: 12, background: '#F4623A', color: '#fff', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>ADMIN</span>
          </div>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1.5px solid #E5E7EB', borderRadius: 50, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#6B7280', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total registrados', value: stats.total,       color: '#3730A3', bg: '#EEF2FF' },
            { label: 'Pendientes',        value: stats.pendientes,  color: '#D97706', bg: '#FEF3C7' },
            { label: 'Verificados',       value: stats.verificados, color: '#059669', bg: '#DCFCE7' },
            { label: 'Rechazados',        value: stats.rechazados,  color: '#DC2626', bg: '#FEF2F2' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '16px 18px', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: s.color, fontWeight: 500, marginTop: 4, opacity: 0.8 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* HEADER + TABS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: '#1A1A2E' }}>
            {vista === 'pendientes' ? 'Pendientes de verificación' : 'Todos los médicos'}
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={'tab-btn ' + (vista === 'pendientes' ? 'on' : 'off')} onClick={() => setVista('pendientes')}>
              Pendientes {stats.pendientes > 0 && '(' + stats.pendientes + ')'}
            </button>
            <button className={'tab-btn ' + (vista === 'todos' ? 'on' : 'off')} onClick={() => setVista('todos')}>
              Todos
            </button>
          </div>
        </div>

        {/* INSTRUCCIÓN SEP */}
        {vista === 'pendientes' && (
          <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Shield size={16} color="#3730A3" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#3730A3', lineHeight: 1.6 }}>
              Para verificar: copia la cédula del médico → abre el portal SEP → búscala → si aparece presiona <strong>Verificar</strong>, si no <strong>Rechazar</strong>.
              <button onClick={abrirSEP} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#4F46E5', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontFamily: "'DM Sans', sans-serif" }}>
                Abrir portal SEP →
              </button>
            </p>
          </div>
        )}

        {/* LISTA */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #EEF2FF', borderTopColor: '#3730A3', borderRadius: '50%', margin: '0 auto 12px' }} className="spin" />
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando médicos...</p>
          </div>
        ) : medicos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🎉</p>
            <p style={{ fontSize: 16, color: '#374151', fontWeight: 700, fontFamily: "'Fraunces', serif" }}>
              {vista === 'pendientes' ? '¡Sin pendientes por verificar!' : 'No hay médicos registrados aún'}
            </p>
          </div>
        ) : (
          medicos.map(m => {
            const sc = statusColor(m.verification_status)
            const esProcesando = procesando === m.id
            const esProcesandoActivo = procesando === m.id + '_activo'
            return (
              <div key={m.id} className="mcard">
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                  {/* AVATAR */}
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#3730A3,#F4623A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                    {(m.full_name || '?')[0].toUpperCase()}
                  </div>

                  {/* INFO */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <p style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 900, color: '#1A1A2E' }}>{m.full_name}</p>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
                        {m.verification_status.charAt(0).toUpperCase() + m.verification_status.slice(1)}
                      </span>
                      {!m.is_active && (
                        <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>Inactivo</span>
                      )}
                    </div>

                    <p style={{ fontSize: 13, color: '#4F46E5', fontWeight: 600, marginBottom: 6 }}>{m.specialty}</p>

                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                      <span>📧 {m.email}</span>
                      {m.phone && <span>📱 {m.phone}</span>}
                      {m.location_city && <span>📍 {m.location_city}</span>}
                      <span>🗓 {formatFecha(m.created_at)}</span>
                    </div>

                    {/* CÉDULA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px' }}>
                        <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Cédula:</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', letterSpacing: '0.05em' }}>{m.professional_license || 'No registrada'}</span>
                        {m.professional_license && (
                          <button onClick={() => copiarCedula(m.professional_license, m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiado === m.id ? '#059669' : '#9CA3AF', padding: 2, display: 'flex', alignItems: 'center' }}>
                            {copiado === m.id ? <CheckCircle size={15} /> : <Copy size={15} />}
                          </button>
                        )}
                      </div>
                      {copiado === m.id && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>¡Copiada!</span>}
                    </div>
                  </div>

                  {/* ACCIONES */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>

                    {/* VERIFICAR / RECHAZAR */}
                    {m.verification_status !== 'verificado' && (
                      <button
                        className="btn-ok"
                        onClick={() => cambiarStatus(m, 'verificado')}
                        disabled={!!esProcesando}
                      >
                        {esProcesando
                          ? <span style={{ width: 14, height: 14, border: '2px solid #05966944', borderTopColor: '#059669', borderRadius: '50%' }} className="spin" />
                          : <CheckCircle size={14} />
                        }
                        Verificar
                      </button>
                    )}

                    {m.verification_status !== 'rechazado' && (
                      <button
                        className="btn-no"
                        onClick={() => cambiarStatus(m, 'rechazado')}
                        disabled={!!esProcesando}
                      >
                        {esProcesando
                          ? <span style={{ width: 14, height: 14, border: '2px solid #DC262644', borderTopColor: '#DC2626', borderRadius: '50%' }} className="spin" />
                          : <XCircle size={14} />
                        }
                        Rechazar
                      </button>
                    )}

                    {/* ACTIVAR / DESACTIVAR */}
                    <button
                      className="btn-sep"
                      onClick={() => toggleActivo(m)}
                      disabled={!!esProcesandoActivo}
                      style={{ justifyContent: 'center' }}
                    >
                      {esProcesandoActivo
                        ? <span style={{ width: 14, height: 14, border: '2px solid #3730A344', borderTopColor: '#3730A3', borderRadius: '50%' }} className="spin" />
                        : m.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />
                      }
                      {m.is_active ? 'Desactivar' : 'Activar'}
                    </button>

                    {/* VER PERFIL */}
                    <Link
                      href={'/doctor/' + m.id}
                      target="_blank"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 50, padding: '7px 14px', fontSize: 13, fontWeight: 500, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}
                    >
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
  )
}