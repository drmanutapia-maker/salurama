'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown, LogIn, UserPlus, HelpCircle, Settings, LogOut, User } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Logo from './Logo'

export default function Navbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showAyudaModal, setShowAyudaModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // ───────────────────────────────────────────
  // VERIFICAR SESIÓN
  // ───────────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
      setUserEmail(session?.user?.email || null)
    }
    
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })

    return () => subscription.unsubscribe()
  }, [])

  // ───────────────────────────────────────────
  // CERRAR SESIÓN
  // ───────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setUserEmail(null)
    setDoctorDropdownOpen(false)
    window.location.href = '/'
  }

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDoctorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ───────────────────────────────────────────
  // ¿ESTÁ EN EL DASHBOARD?
  // ───────────────────────────────────────────
  const isDashboard = pathname === '/dashboard'

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E5E7EB',
        zIndex: 1000
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '16px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 40
        }}>
          <Logo size="medium" />

          {/* Desktop Navigation */}
          <nav className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <Link href="/buscar" style={{ color: '#4A5568', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              Especialidades
            </Link>
            <Link href="/como-elegir-medico" style={{ color: '#4A5568', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              ¿Cómo elegir médico?
            </Link>
            <button
              onClick={() => setShowAyudaModal(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#4A5568',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 14,
                fontWeight: 500
              }}
            >
              <HelpCircle size={18} />
              Ayuda
            </button>
          </nav>

          {/* Soy Médico - Dropdown */}
          <div ref={dropdownRef} className="desktop-only" style={{ position: 'relative' }}>
            <button
              onClick={() => setDoctorDropdownOpen(!doctorDropdownOpen)}
              style={{
                background: 'linear-gradient(135deg, #1E3A5F 0%, #1A3254 100%)',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: 50,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
            >
              Soy Médico
              <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: doctorDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {doctorDropdownOpen && (
              <div className="fade-in" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                boxShadow: '0 10px 40px rgba(30, 58, 95, 0.15)',
                minWidth: 200,
                overflow: 'hidden',
                zIndex: 1001
              }}>
                {isLoggedIn ? (
                  <>
                    {/* PERFIL - Solo si NO está en dashboard */}
                    {!isDashboard && (
                      <Link
                        href="/dashboard"
                        onClick={() => setDoctorDropdownOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 16px',
                          color: '#1E3A5F',
                          textDecoration: 'none',
                          fontSize: 14,
                          fontWeight: 500,
                          borderBottom: '1px solid #F3F4F6',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F5F3FF'
                          e.currentTarget.style.color = '#1E3A5F'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fff'
                          e.currentTarget.style.color = '#1E3A5F'
                        }}
                      >
                        <User size={18} />
                        Perfil
                      </Link>
                    )}
                    
                    {/* CONFIGURACIÓN */}
                    <Link
                      href="/dashboard"
                      onClick={() => setDoctorDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        color: '#1E3A5F',
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F5F3FF'
                        e.currentTarget.style.color = '#1E3A5F'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff'
                        e.currentTarget.style.color = '#1E3A5F'
                      }}
                    >
                      <Settings size={18} />
                      Configuración
                    </Link>
                    
                    {/* CERRAR SESIÓN */}
                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        color: '#DC2626',
                        background: 'none',
                        border: 'none',
                        width: '100%',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FEF2F2'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff'
                      }}
                    >
                      <LogOut size={18} />
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setDoctorDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        color: '#1E3A5F',
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F5F3FF'
                        e.currentTarget.style.color = '#1E3A5F'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff'
                        e.currentTarget.style.color = '#1E3A5F'
                      }}
                    >
                      <LogIn size={18} />
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/registro"
                      onClick={() => setDoctorDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        color: '#1E3A5F',
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F5F3FF'
                        e.currentTarget.style.color = '#1E3A5F'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff'
                        e.currentTarget.style.color = '#1E3A5F'
                      }}
                    >
                      <UserPlus size={18} />
                      Registrarme
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-only"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#1E3A5F'
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fade-in mobile-only" style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            borderBottom: '1px solid #E5E7EB',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <Link href="/buscar" onClick={() => setMobileMenuOpen(false)} style={{ color: '#4A5568', textDecoration: 'none', fontSize: 16, fontWeight: 500 }}>
              Especialidades
            </Link>
            <Link href="/como-elegir-medico" onClick={() => setMobileMenuOpen(false)} style={{ color: '#4A5568', textDecoration: 'none', fontSize: 16, fontWeight: 500 }}>
              ¿Cómo elegir médico?
            </Link>
            <Link href="/ayuda" onClick={() => setMobileMenuOpen(false)} style={{ color: '#4A5568', textDecoration: 'none', fontSize: 16, fontWeight: 500 }}>
              Ayuda
            </Link>
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16, marginTop: 8 }}>
              <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>
                Soy Médico
              </p>
              {isLoggedIn ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!isDashboard && (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        background: '#F5F3FF',
                        borderRadius: 8,
                        color: '#1E3A5F',
                        textDecoration: 'none',
                        fontSize: 15,
                        fontWeight: 500
                      }}
                    >
                      <User size={18} />
                      Perfil
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: '#F9FAFB',
                      borderRadius: 8,
                      color: '#1E3A5F',
                      textDecoration: 'none',
                      fontSize: 15,
                      fontWeight: 500
                    }}
                  >
                    <Settings size={18} />
                    Configuración
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: '#FEF2F2',
                      borderRadius: 8,
                      color: '#DC2626',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: 500
                    }}
                  >
                    <LogOut size={18} />
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: '#F9FAFB',
                      borderRadius: 8,
                      color: '#1E3A5F',
                      textDecoration: 'none',
                      fontSize: 15,
                      fontWeight: 500
                    }}
                  >
                    <LogIn size={18} />
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/registro"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #1E3A5F 0%, #1A3254 100%)',
                      borderRadius: 8,
                      color: '#fff',
                      textDecoration: 'none',
                      fontSize: 15,
                      fontWeight: 600
                    }}
                  >
                    <UserPlus size={18} />
                    Registrarme
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Modal Ayuda */}
      {showAyudaModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: 20
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: 36,
            maxWidth: 600,
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowAyudaModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6B7280'
              }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: 26, fontWeight: 900, color: '#1E3A5F', marginBottom: 24 }}>
              ¿Cómo elegir médico?
            </h3>
            <button
              onClick={() => setShowAyudaModal(false)}
              style={{
                width: '100%',
                padding: 14,
                background: '#1E3A5F',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}