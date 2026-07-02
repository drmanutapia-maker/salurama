'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, BookOpen, ClipboardList } from 'lucide-react'

const ADMIN_LINKS = [
  { href: '/hema/admin/protocolos', label: 'Protocolos', icon: BookOpen },
  { href: '/hema/admin/auditoria', label: 'Auditoría', icon: ClipboardList },
]

export default function HemaAdminNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        background: '#EEF2F7',
        border: '1px solid #CDDAE8',
        borderRadius: 12,
        padding: '0 12px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      <Link
        href="/hema"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 12px 10px 4px',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          whiteSpace: 'nowrap',
          textDecoration: 'none',
          color: '#6B7280',
          borderRight: '1px solid #CDDAE8',
          marginRight: 4,
          minHeight: 44,
        }}
      >
        <ArrowLeft size={13} />
        Clínico
      </Link>

      {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            prefetch
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 12px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              borderBottom: `2px solid ${active ? '#1E3A5F' : 'transparent'}`,
              color: active ? '#1E3A5F' : '#6B7280',
              transition: 'color 0.15s, border-color 0.15s',
              minHeight: 44,
            }}
          >
            <Icon size={14} />
            {label}
          </Link>
        )
      })}

      <span
        style={{
          marginLeft: 'auto',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#7EA8C9',
          fontFamily: "'DM Sans', sans-serif",
          paddingRight: 4,
          flexShrink: 0,
        }}
      >
        ZONA ADMIN
      </span>
    </nav>
  )
}
