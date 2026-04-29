'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Calendar, HelpCircle } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/', icon: Home, label: 'Inicio' },
    { href: '/buscar', icon: Search, label: 'Buscar' },
    { href: '/login', icon: Calendar, label: 'Citas' },
    { href: '/ayuda', icon: HelpCircle, label: 'Ayuda' }
  ]

  return (
    <nav
      className="mobile-only fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #E5E7EB',
        boxShadow: '0 -4px 12px rgba(17, 28, 44, 0.06)',
        padding: '8px 0 24px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          maxWidth: 600,
          margin: '0 auto'
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 16px',
                background: active ? '#DEE8FF' : 'transparent',
                borderRadius: 8,
                color: active ? '#1E3A5F' : '#6B7280',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={20} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}