'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown } from 'lucide-react'
import Logo from './Logo'

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [doctorOpen, setDoctorOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current &&!dropdownRef.current.contains(e.target as Node)) {
        setDoctorOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cerrar dropdown al cambiar de página
  useEffect(() => {
    setDoctorOpen(false)
    setMobileOpen(false)
  }, [pathname])

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      background: '#fff', borderBottom: '1px solid #E5E7EB',
      zIndex: 1000, height: 68
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', height: '100%', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size="medium" />

        <nav style={{ display: 'flex', gap: 32 }} className="hide-mobile">
          <Link href="/buscar" style={{ color: pathname==='/buscar'? '#8B5CF6' : '#4A5568', textDecoration: 'none', fontSize: 14 }}>Especialidades</Link>
          <Link href="/como-elegir-medico" style={{ color: '#4A5568', textDecoration: 'none', fontSize: 14 }}>¿Cómo elegir médico?</Link>
          <Link href="/nosotros" style={{ color: '#4A5568', textDecoration: 'none', fontSize: 14 }}>Nosotros</Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="hide-mobile" style={{ position: 'relative' }} ref={dropdownRef}>
            <button onClick={() => setDoctorOpen(!doctorOpen)} style={{ background: '#1E3A5F', color: '#fff', padding: '8px 18px', borderRadius: 50, border: 'none', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              Soy Médico <ChevronDown size={16} style={{ transform: doctorOpen? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </button>
            {doctorOpen && (
              <div style={{ position: 'absolute', top: 44, right: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: 180, overflow: 'hidden' }}>
                <Link href="/login" onClick={() => setDoctorOpen(false)} style={{ display: 'block', padding: '10px 14px', color: '#1E3A5F', textDecoration: 'none', fontSize: 14, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>Iniciar sesión</Link>
                <Link href="/registro" onClick={() => setDoctorOpen(false)} style={{ display: 'block', padding: '10px 14px', color: '#1E3A5F', textDecoration: 'none', fontSize: 14, borderTop: '1px solid #F3F4F6', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>Registrarme</Link>
              </div>
            )}
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="show-mobile" style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}>
            {mobileOpen? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div style={{ background: '#fff', borderTop: '1px solid #E5E7EB', padding: 16 }}>
          <Link href="/buscar" onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: '12px 0', color: '#1E3A5F', textDecoration: 'none' }}>Especialidades</Link>
          <Link href="/como-elegir-medico" onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: '12px 0', color: '#1E3A5F', textDecoration: 'none' }}>¿Cómo elegir?</Link>
          <Link href="/nosotros" onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: '12px 0', color: '#1E3A5F', textDecoration: 'none' }}>Nosotros</Link>
          <Link href="/login" onClick={() => setMobileOpen(false)} style={{ display: 'block', padding: '12px 0', color: '#1E3A5F', textDecoration: 'none', marginTop: 8, borderTop: '1px solid #F3F4F6', paddingTop: 16 }}>Soy Médico - Iniciar sesión</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {.hide-mobile { display: none!important; }.show-mobile { display: block!important; } }
        @media (min-width: 768px) {.hide-mobile { display: flex!important; }.show-mobile { display: none!important; } }
      `}</style>
    </header>
  )
}