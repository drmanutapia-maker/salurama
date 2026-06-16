'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react'

const NAV_LINKS = [
  { href: '/hema', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/hema/pacientes', label: 'Pacientes', icon: Users },
  { href: '/hema/ordenes', label: 'Indicaciones', icon: FileText },
  { href: '/hema/labs', label: 'Labs', icon: FlaskConical },
  { href: '/hema/admin', label: 'Admin', icon: ShieldCheck },
]

export default function HemaNav() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <nav
      style={{
        position: 'sticky',
        top: 72,
        zIndex: 30,
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              prefetch
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 14px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                borderBottom: `2px solid ${active ? '#1E3A5F' : 'transparent'}`,
                color: active ? '#1E3A5F' : '#6B7280',
                transition: 'color 0.15s, border-color 0.15s',
                minHeight: 48,
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
