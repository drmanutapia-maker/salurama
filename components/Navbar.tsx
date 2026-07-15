'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Menu, X, LogOut, User, UserPlus, LayoutDashboard, ArrowLeft, CreditCard } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isDoctorPage = pathname?.startsWith('/doctor/')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleLogout = async () => {
    localStorage.removeItem('salurama_remember')
    await supabase.auth.signOut()
    setShowDropdown(false); setMobileOpen(false); router.push('/')
  }

  const handleBack = () => {
    const p = new URLSearchParams(window.location.search)
    const from = p.get('from')
    
    if (from === 'buscar') {
      const q = p.get('q'); const estado = p.get('estado')
      const np = new URLSearchParams(); if (q) np.set('especialidad', q); if (estado) np.set('estado', estado)
      router.push(`/buscar?${np.toString()}`)
      return
    }
    
    if (window.history.length > 2) {
      router.back()
      return
    }
    
    if (user && isDoctorPage) {
      router.push('/dashboard')
      return
    }
    
    if (document.referrer.includes('/buscar')) {
      router.back()
      return
    }
    
    router.push('/buscar')
  }

  const navLinks = [
    { href: '/buscar', label: 'Especialidades' },
    { href: '/como-elegir-medico', label: '¿Cómo elegir médico?' },
    { href: '/nosotros', label: 'Nosotros' },
  ]

  return (
    <nav data-version="v5-unificado" style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#fff', borderBottom: '1px solid #E5E7EB', zIndex: 1000, height: 72 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isDoctorPage ? (
          <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#1E3A5F', fontSize: 14, fontWeight: 600 }}>
            <ArrowLeft size={20} /><span className="desktop-only">Volver</span>
          </button>
        ) : (
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#1E3A5F' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: '#2A9D8F' }}>rama</span>
          </Link>
        )}

        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} className="nav-link" style={{ color: pathname === l.href ? '#8B5CF6' : '#4B5563', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="desktop-only" style={{ position: 'relative' }} ref={dropdownRef}>
            <button onClick={() => setShowDropdown(!showDropdown)} className="cta-btn" style={{ background: '#1E3A5F', color: 'white', border: 'none', borderRadius: 50, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {user ? 'Mi cuenta' : 'Soy Médico'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showDropdown && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #E5E7EB', minWidth: 200, overflow: 'hidden', zIndex: 100 }}>
                {user ? (
                  <>
                    <Link href="/dashboard" onClick={() => setShowDropdown(false)} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: '#374151', textDecoration: 'none', fontSize: 14, borderBottom: '1px solid #F3F4F6' }}><LayoutDashboard size={16}/> Mi perfil</Link>
                    <button onClick={handleLogout} className="dropdown-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', color: '#DC2626', fontSize: 14, cursor: 'pointer', textAlign: 'left' }}><LogOut size={16}/> Cerrar sesión</button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setShowDropdown(false)} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: '#7C3AED', textDecoration: 'none', fontSize: 14, fontWeight: 600, background: '#F5F3FF', borderBottom: '1px solid #E5E7EB' }}><User size={16}/> Iniciar sesión</Link>
                    <Link href="/registro" onClick={() => setShowDropdown(false)} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: '#374151', textDecoration: 'none', fontSize: 14 }}><UserPlus size={16}/> Registrarme</Link>
                  </>
                )}
              </div>
            )}
          </div>
          <button className="mobile-only" onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>{mobileOpen ? <X size={24}/> : <Menu size={24}/>}</button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-only" style={{ position: 'absolute', top: 72, left: 0, right: 0, background: 'white', borderBottom: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0.08)', maxHeight: 'calc(100vh - 72px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: '16px 24px', color: '#374151', textDecoration: 'none', fontSize: 16, fontWeight: 500, borderBottom: '1px solid #F3F4F6' }}>{l.label}</Link>
            ))}
          </div>
          <div style={{ padding: '20px 24px', background: '#F9FAFB', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, color: '#1A1A2E', textDecoration: 'none', fontWeight: 500 }}><LayoutDashboard size={18}/> Mi perfil</Link>
                <Link href="/dashboard/plan" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, color: '#1A1A2E', textDecoration: 'none', fontWeight: 500 }}><CreditCard size={18}/> Mi plan</Link>
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: 'white', border: '1px solid #FECACA', borderRadius: 12, color: '#DC2626', fontWeight: 500, width: '100%' }}><LogOut size={18}/> Cerrar sesión</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: '#1E3A5F', borderRadius: 12, color: 'white', textDecoration: 'none', fontWeight: 600 }}><User size={18}/> Iniciar sesión</Link>
                <Link href="/registro" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, color: '#1A1A2E', textDecoration: 'none', fontWeight: 500 }}><UserPlus size={18}/> Registrarme</Link>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .nav-link:hover { color: #8B5CF6 !important; }
        .cta-btn:hover { background: #172E4D !important; }
        .dropdown-item:hover { background: #F9FAFB !important; }
        @media (min-width: 768px) { .desktop-only { display: flex !important; } .mobile-only { display: none !important; } }
        @media (max-width: 767px) { .desktop-only { display: none !important; } .mobile-only { display: block !important; } }
      `}</style>
    </nav>
  )
}