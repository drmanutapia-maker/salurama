'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import Logo from './Logo'
import BackButton from './BackButton'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isDashboard = pathname.startsWith('/dashboard')
  const isDoctorPage = pathname.startsWith('/doctor/')
  const isPublicPage = !isDashboard && !pathname.startsWith('/login') && !pathname.startsWith('/signup')
  
  // Mostrar back button en: dashboard y doctor pages
  const showBack = isDashboard || isDoctorPage

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: '#fff',
      borderBottom: '1px solid #E5E7EB',
      zIndex: 100,
      height: 64,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 20px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {showBack && <BackButton />}
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Logo />
          </Link>
        </div>

        <nav className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/especialidades" style={{ fontSize: 14, color: '#4A5568', textDecoration: 'none', fontWeight: 500 }}>
            Especialidades
          </Link>
          <Link href="/como-elegir" style={{ fontSize: 14, color: '#4A5568', textDecoration: 'none', fontWeight: 500 }}>
            ¿Cómo elegir médico?
          </Link>
          <Link href="/nosotros" style={{ fontSize: 14, color: '#4A5568', textDecoration: 'none', fontWeight: 500 }}>
            Nosotros
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/dashboard"
            className="desktop-only"
            style={{
              background: '#1E3A5F',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: 50,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Mi cuenta
          </Link>
          
          <button
            className="mobile-only"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          background: '#fff',
          borderBottom: '1px solid #E5E7EB',
          padding: 20,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Link href="/especialidades" style={{ fontSize: 16, color: '#1E3A5F', textDecoration: 'none', fontWeight: 500 }}>
              Especialidades
            </Link>
            <Link href="/como-elegir" style={{ fontSize: 16, color: '#1E3A5F', textDecoration: 'none', fontWeight: 500 }}>
              ¿Cómo elegir médico?
            </Link>
            <Link href="/nosotros" style={{ fontSize: 16, color: '#1E3A5F', textDecoration: 'none', fontWeight: 500 }}>
              Nosotros
            </Link>
            <Link href="/dashboard" style={{ fontSize: 16, color: '#1E3A5F', textDecoration: 'none', fontWeight: 600, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
              Mi cuenta
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        @media (max-width: 767px) { .desktop-only { display: none !important; } }
        @media (min-width: 768px) { .mobile-only { display: none !important; } }
      `}</style>
    </header>
  )
}