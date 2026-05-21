'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Heart, Calendar } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const items = [
    { href: '/buscar', label: 'Buscar', icon: Search },
    { href: '/favoritos', label: 'Favoritos', icon: Heart },
    { href: '/citas', label: 'Citas', icon: Calendar },
  ]

  return (
    <nav className="mobile-only" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fff',
      borderTop: '1px solid #E5E7EB',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
    }}>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
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
              textDecoration: 'none',
              color: isActive? '#8B5CF6' : '#6B7280',
              minWidth: 80
            }}
          >
            <Icon size={22} strokeWidth={isActive? 2.5 : 2} />
            <span style={{ fontSize: 11, fontWeight: isActive? 700 : 500 }}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}