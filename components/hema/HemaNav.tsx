'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  FlaskConical,
  ShieldCheck,
  MessageCircleQuestion,
} from 'lucide-react'

const CLINICAL_LINKS = [
  { href: '/hema', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/hema/pacientes', label: 'Pacientes', icon: Users },
  { href: '/hema/ordenes/nueva', label: 'Indicaciones', icon: FileText },
  { href: '/hema/labs', label: 'Labs', icon: FlaskConical },
  { href: '/hema/educacion', label: 'MSL Virtual', icon: MessageCircleQuestion },
]

export default function HemaNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const linkStyle = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '12px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap' as const,
    textDecoration: 'none',
    borderBottom: `2px solid ${active ? '#1E3A5F' : 'transparent'}`,
    color: active ? '#1E3A5F' : '#6B7280',
    transition: 'color 0.15s, border-color 0.15s',
    minHeight: 48,
  })

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
        {CLINICAL_LINKS.map(({ href, label, icon: Icon, exact }) => (
          <Link key={href} href={href} prefetch style={linkStyle(isActive(href, exact))}>
            <Icon size={15} />
            {label}
          </Link>
        ))}

        {isAdmin && (
          <Link href="/hema/admin/protocolos" prefetch style={linkStyle(isActive('/hema/admin'))}>
            <ShieldCheck size={15} />
            Admin
          </Link>
        )}
      </div>
    </nav>
  )
}
