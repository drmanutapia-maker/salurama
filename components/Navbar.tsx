'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Menu, X, LogOut, User, Shield, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [soyMedicoDropdown, setSoyMedicoDropdown] = useState(false)
  const [mobileSoyMedicoOpen, setMobileSoyMedicoOpen] = useState(false)

  useEffect(() => {
    checkAuth()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth()
    })
    
    return () => subscription.unsubscribe()
  }, [])

  // Cerrar menú al cambiar de página
  useEffect(() => {
    setMobileMenuOpen(false)
    setMobileSoyMedicoOpen(false)
    setSoyMedicoDropdown(false)
  }, [pathname])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.soy-medico-dropdown')) {
        setSoyMedicoDropdown(false)
      }
    }

    if (soyMedicoDropdown) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [soyMedicoDropdown])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)
    
    const adminEmail = sessionStorage.getItem('salurama_admin_email')
    setIsAdmin(!!adminEmail)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.removeItem('salurama_admin')
    sessionStorage.removeItem('salurama_admin_email')
    setSoyMedicoDropdown(false)
    setMobileMenuOpen(false)
    setMobileSoyMedicoOpen(false)
    router.push('/')
  }

  const isActive = (path: string) => pathname === path

  const toggleSoyMedicoDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSoyMedicoDropdown(!soyMedicoDropdown)
  }

  const toggleMobileSoyMedico = () => {
    setMobileSoyMedicoOpen(!mobileSoyMedicoOpen)
  }

  if (loading) return null

  return (
    <nav style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 100, 
      background: 'rgba(255,255,255,0.98)', 
      backdropFilter: 'blur(14px)', 
      borderBottom: '1px solid #F3F4F6', 
      padding: '0 12px',
      width: '100%'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#3730A3', letterSpacing: '-0.5px' }}>Salu</span>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: '#F4623A', letterSpacing: '-0.5px' }}>rama</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="dsk" style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
          <Link 
            href="/buscar" 
            style={{ 
              fontSize: 14, 
              color: isActive('/buscar') ? '#3730A3' : '#1A1A2E', 
              textDecoration: 'none', 
              fontWeight: isActive('/buscar') ? 600 : 400,
              borderBottom: isActive('/buscar') ? '2px solid #3730A3' : '2px solid transparent',
              paddingBottom: '2px',
              transition: 'color 0.15s, border-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3730A3'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/buscar') ? '#3730A3' : '#1A1A2E'}
          >
            Especialidades
          </Link>
          <Link 
            href="/como-elegir-medico" 
            style={{ 
              fontSize: 14, 
              color: isActive('/como-elegir-medico') ? '#3730A3' : '#1A1A2E', 
              textDecoration: 'none', 
              fontWeight: isActive('/como-elegir-medico') ? 600 : 400,
              borderBottom: isActive('/como-elegir-medico') ? '2px solid #3730A3' : '2px solid transparent',
              paddingBottom: '2px',
              transition: 'color 0.15s, border-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3730A3'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/como-elegir-medico') ? '#3730A3' : '#1A1A2E'}
          >
            ¿Cómo elegir?
          </Link>
          <Link 
            href="/nosotros" 
            style={{ 
              fontSize: 14, 
              color: isActive('/nosotros') ? '#3730A3' : '#1A1A2E', 
              textDecoration: 'none', 
              fontWeight: isActive('/nosotros') ? 600 : 400,
              borderBottom: isActive('/nosotros') ? '2px solid #3730A3' : '2px solid transparent',
              paddingBottom: '2px',
              transition: 'color 0.15s, border-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3730A3'}
            onMouseLeave={(e) => e.currentTarget.style.color = isActive('/nosotros') ? '#3730A3' : '#1A1A2E'}
          >
            Nosotros
          </Link>
          
          {/* Auth Section - Diferente según estado de sesión */}
          {user ? (
            /* USUARIO LOGUEADO (Médico) - Desktop */
            <>
              <Link 
                href="/dashboard" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  fontSize: 13, 
                  color: '#3730A3', 
                  fontWeight: 600, 
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: 50,
                  background: '#EEF2FF',
                  transition: 'background 0.18s, transform 0.12s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#C7D2FE'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#EEF2FF'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <User size={14} />
                <span>Mi Perfil</span>
              </Link>
              <button 
                onClick={handleLogout}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  background: 'none', 
                  border: '1.5px solid #E5E7EB', 
                  borderRadius: 50, 
                  padding: '6px 12px', 
                  fontSize: 13, 
                  fontWeight: 500, 
                  color: '#6B7280', 
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'border-color 0.18s, color 0.18s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#DC2626'
                  e.currentTarget.style.color = '#DC2626'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB'
                  e.currentTarget.style.color = '#6B7280'
                }}
              >
                <LogOut size={14} />
                <span>Salir</span>
              </button>
            </>
          ) : isAdmin ? (
            /* ADMIN LOGUEADO - Desktop */
            <>
              <Link 
                href="/admin" 
                style={{ 
                  fontSize: 13, 
                  color: '#F4623A', 
                  fontWeight: 700, 
                  textDecoration: 'none',
                  background: '#FEF2F2',
                  padding: '6px 12px',
                  borderRadius: 50,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 0.18s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#FEF2F2'}
              >
                <Shield size={14} />
                <span>Admin</span>
              </Link>
              <button 
                onClick={handleLogout}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  background: 'none', 
                  border: '1.5px solid #E5E7EB', 
                  borderRadius: 50, 
                  padding: '6px 12px', 
                  fontSize: 13, 
                  fontWeight: 500, 
                  color: '#6B7280', 
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'border-color 0.18s, color 0.18s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#DC2626'
                  e.currentTarget.style.color = '#DC2626'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB'
                  e.currentTarget.style.color = '#6B7280'
                }}
              >
                <LogOut size={14} />
                <span>Salir</span>
              </button>
            </>
          ) : (
            /* NO HAY SESIÓN - Dropdown "Soy Médico" con CLIC - Desktop */}
            <div className="soy-medico-dropdown" style={{ position: 'relative' }}>
              <button
                onClick={toggleSoyMedicoDropdown}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4,
                  background: '#3730A3', 
                  color: '#fff', 
                  border: 'none',
                  padding: '8px 14px', 
                  borderRadius: 50, 
                  fontSize: 13, 
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'background 0.18s, transform 0.12s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#4F46E5'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3730A3'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                👨‍⚕️ <span>Soy Médico</span>
                <ChevronDown 
                  size={14} 
                  style={{ 
                    transform: soyMedicoDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} 
                />
              </button>
              
              {/* Dropdown Desktop - Aparece al hacer CLIC */}
              {soyMedicoDropdown && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: 12,
                    boxShadow: '0 10px 32px rgba(55,48,163,0.12)',
                    padding: '8px 0',
                    minWidth: 200,
                    zIndex: 100,
                    animation: 'fadeIn 0.15s ease-out'
                  }}
                >
                  <Link
                    href="/login"
                    onClick={() => setSoyMedicoDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      color: '#1A1A2E',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 500,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <LogOut size={16} color="#3730A3" />
                    Iniciar sesión
                  </Link>
                  <div style={{ height: '1px', background: '#F3F4F6', margin: '4px 0' }} />
                  <Link
                    href="/registro"
                    onClick={() => setSoyMedicoDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      color: '#3730A3',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 600,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#EEF2FF'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <User size={16} />
                    Registrarme
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Mobile burger */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
          className="mob-btn"
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileMenuOpen ? <X size={22} color="#3730A3" /> : <Menu size={22} color="#3730A3" />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="mob-menu" style={{ padding: '12px 16px 20px', borderTop: '1px solid #F3F4F6', background: '#fff', position: 'absolute', left: 0, right: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Link href="/buscar" onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }} style={{ fontSize: 15, color: '#1A1A2E', textDecoration: 'none', padding: '10px 8px', fontWeight: 500 }}>
              Especialidades
            </Link>
            <Link href="/como-elegir-medico" onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }} style={{ fontSize: 15, color: '#1A1A2E', textDecoration: 'none', padding: '10px 8px', fontWeight: 500 }}>
              ¿Cómo elegir médico?
            </Link>
            <Link href="/nosotros" onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }} style={{ fontSize: 15, color: '#1A1A2E', textDecoration: 'none', padding: '10px 8px', fontWeight: 500 }}>
              Nosotros
            </Link>
            
            {/* Mobile Auth Section */}
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }} style={{ fontSize: 15, color: '#3730A3', fontWeight: 600, textDecoration: 'none', padding: '10px 8px' }}>
                  Mi Perfil
                </Link>
                <button onClick={handleLogout} style={{ fontSize: 15, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 8px', textAlign: 'left', fontWeight: 500 }}>
                  Cerrar sesión
                </button>
              </>
            ) : isAdmin ? (
              <>
                <Link href="/admin" onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }} style={{ fontSize: 15, color: '#F4623A', fontWeight: 600, textDecoration: 'none', padding: '10px 8px' }}>
                  Admin Panel
                </Link>
                <button onClick={handleLogout} style={{ fontSize: 15, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 8px', textAlign: 'left', fontWeight: 500 }}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <div>
                <button
                  onClick={toggleMobileSoyMedico}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 15,
                    color: '#1A1A2E',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: 500
                  }}
                >
                  <span>👨‍⚕️ Soy Médico</span>
                  <ChevronDown 
                    size={16} 
                    style={{ 
                      transform: mobileSoyMedicoOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      color: '#9CA3AF'
                    }} 
                  />
                </button>
                
                {mobileSoyMedicoOpen && (
                  <div style={{ 
                    paddingLeft: 16, 
                    paddingTop: 8,
                    animation: 'slideIn 0.2s ease-out'
                  }}>
                    <Link 
                      href="/login" 
                      onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 14,
                        color: '#3730A3',
                        fontWeight: 500,
                        textDecoration: 'none',
                        padding: '8px 8px',
                        marginBottom: 4
                      }}
                    >
                      <LogOut size={14} />
                      Iniciar sesión
                    </Link>
                    <Link 
                      href="/registro" 
                      onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 14,
                        color: '#3730A3',
                        fontWeight: 600,
                        textDecoration: 'none',
                        padding: '8px 8px',
                        background: '#EEF2FF',
                        borderRadius: 8
                      }}
                    >
                      <User size={14} />
                      Registrarme
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 200px; }
        }
        @media (max-width: 768px) {
          .dsk { display: none !important; }
          .mob-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mob-btn { display: none !important; }
          .mob-menu { display: none !important; }
        }
      `}</style>
    </nav>
  )
}