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
    router.push('/')
  }

  const isActive = (path: string) => pathname === path

  const toggleSoyMedicoDropdown = () => {
    setSoyMedicoDropdown(!soyMedicoDropdown)
    setMobileSoyMedicoOpen(false)
  }

  const toggleMobileSoyMedico = () => {
    setMobileSoyMedicoOpen(!mobileSoyMedicoOpen)
    setSoyMedicoDropdown(false)
  }

  if (loading) return null

  return (
    <nav style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 100, 
      background: 'rgba(255,255,255,0.97)', 
      backdropFilter: 'blur(14px)', 
      borderBottom: '1px solid #F3F4F6', 
      padding: '0 20px' 
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#3730A3', letterSpacing: '-0.5px' }}>Salu</span>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: '#F4623A', letterSpacing: '-0.5px' }}>rama</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="dsk" style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
          <Link 
            href="/buscar" 
            style={{ 
              fontSize: 15, 
              color: isActive('/buscar') ? '#3730A3' : '#1A1A2E', 
              textDecoration: 'none', 
              fontWeight: isActive('/buscar') ? 600 : 400,
              borderBottom: isActive('/buscar') ? '2px solid #3730A3' : '2px solid transparent',
              paddingBottom: '2px'
            }}
          >
            Especialidades
          </Link>
          <Link 
            href="/como-elegir-medico" 
            style={{ 
              fontSize: 15, 
              color: isActive('/como-elegir-medico') ? '#3730A3' : '#1A1A2E', 
              textDecoration: 'none', 
              fontWeight: isActive('/como-elegir-medico') ? 600 : 400,
              borderBottom: isActive('/como-elegir-medico') ? '2px solid #3730A3' : '2px solid transparent',
              paddingBottom: '2px'
            }}
          >
            ¿Cómo elegir médico?
          </Link>
          <Link 
            href="/nosotros" 
            style={{ 
              fontSize: 15, 
              color: isActive('/nosotros') ? '#3730A3' : '#1A1A2E', 
              textDecoration: 'none', 
              fontWeight: isActive('/nosotros') ? 600 : 400,
              borderBottom: isActive('/nosotros') ? '2px solid #3730A3' : '2px solid transparent',
              paddingBottom: '2px'
            }}
          >
            Nosotros
          </Link>
          
          {/* Auth Section */}
          {user ? (
            // Usuario logueado (médico)
            <>
              <Link 
                href="/dashboard" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  fontSize: 14, 
                  color: '#3730A3', 
                  fontWeight: 600, 
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: 50,
                  background: '#EEF2FF'
                }}
              >
                <User size={16} />
                Mi Dashboard
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
                  padding: '8px 16px', 
                  fontSize: 14, 
                  fontWeight: 500, 
                  color: '#6B7280', 
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              >
                <LogOut size={16} />
                Salir
              </button>
            </>
          ) : isAdmin ? (
            // Admin logueado
            <>
              <Link 
                href="/admin" 
                style={{ 
                  fontSize: 14, 
                  color: '#F4623A', 
                  fontWeight: 700, 
                  textDecoration: 'none',
                  background: '#FEF2F2',
                  padding: '8px 16px',
                  borderRadius: 50,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Shield size={16} />
                Admin
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
                  padding: '8px 16px', 
                  fontSize: 14, 
                  fontWeight: 500, 
                  color: '#6B7280', 
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              >
                <LogOut size={16} />
                Salir
              </button>
            </>
          ) : (
            // No hay sesión - Dropdown "Soy Médico"
            <div style={{ position: 'relative' }}>
              <button
                onClick={toggleSoyMedicoDropdown}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  background: '#3730A3', 
                  color: '#fff', 
                  border: 'none',
                  padding: '10px 20px', 
                  borderRadius: 50, 
                  fontSize: 14, 
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'background 0.18s'
                }}
                onMouseEnter={() => setSoyMedicoDropdown(true)}
              >
                👨‍⚕️ Soy Médico
                <ChevronDown 
                  size={16} 
                  style={{ 
                    transform: soyMedicoDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} 
                />
              </button>
              
              {/* Dropdown Menu */}
              {soyMedicoDropdown && (
                <>
                  {/* Overlay para cerrar al hacer clic fuera */}
                  <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                    onClick={() => setSoyMedicoDropdown(false)}
                  />
                  
                  {/* Dropdown content */}
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
                    onMouseLeave={() => setSoyMedicoDropdown(false)}
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
                    >
                      <User size={16} />
                      Registrarme
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Mobile burger */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          className="mob-btn"
        >
          {mobileMenuOpen ? <X size={24} color="#3730A3" /> : <Menu size={24} color="#3730A3" />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="mob-menu" style={{ padding: '12px 20px 20px', borderTop: '1px solid #F3F4F6', background: '#fff' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Link href="/buscar" onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }} style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px' }}>
              Especialidades
            </Link>
            <Link href="/como-elegir-medico" onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }} style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px' }}>
              ¿Cómo elegir médico?
            </Link>
            <Link href="/nosotros" onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }} style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px' }}>
              Nosotros
            </Link>
            
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }} style={{ fontSize: 16, color: '#3730A3', fontWeight: 600, textDecoration: 'none', padding: '12px 8px' }}>
                  Mi Dashboard
                </Link>
                <button onClick={handleLogout} style={{ fontSize: 16, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 8px', textAlign: 'left' }}>
                  Cerrar sesión
                </button>
              </>
            ) : isAdmin ? (
              <>
                <Link href="/admin" onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }} style={{ fontSize: 16, color: '#F4623A', fontWeight: 600, textDecoration: 'none', padding: '12px 8px' }}>
                  Admin Panel
                </Link>
                <button onClick={handleLogout} style={{ fontSize: 16, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 8px', textAlign: 'left' }}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                {/* Mobile: Soy Médico expandible */}
                <div>
                  <button
                    onClick={toggleMobileSoyMedico}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 16,
                      color: '#1A1A2E',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '12px 8px',
                      textAlign: 'left',
                      fontWeight: 500
                    }}
                  >
                    <span>👨‍⚕️ Soy Médico</span>
                    <ChevronDown 
                      size={18} 
                      style={{ 
                        transform: mobileSoyMedicoOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        color: '#9CA3AF'
                      }} 
                    />
                  </button>
                  
                  {/* Submenu móvil */}
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
                          fontSize: 15,
                          color: '#3730A3',
                          fontWeight: 500,
                          textDecoration: 'none',
                          padding: '10px 8px',
                          marginBottom: 4
                        }}
                      >
                        <LogOut size={16} />
                        Iniciar sesión
                      </Link>
                      <Link 
                        href="/registro" 
                        onClick={() => { setMobileMenuOpen(false); setMobileSoyMedicoOpen(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 15,
                          color: '#3730A3',
                          fontWeight: 600,
                          textDecoration: 'none',
                          padding: '10px 8px',
                          background: '#EEF2FF',
                          borderRadius: 8
                        }}
                      >
                        <User size={16} />
                        Registrarme
                      </Link>
                    </div>
                  )}
                </div>
              </>
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
      `}</style>
    </nav>
  )
}