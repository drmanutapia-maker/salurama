'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Inicio', exact: true },
    { href: '/dashboard/horario', label: 'Horarios' },
    { href: '/dashboard/citas', label: 'Citas' },
    { href: '/dashboard/estadisticas', label: 'Estadísticas' },
  ]

  const isActive = (href: string, exact?: boolean) =>
    exact? pathname === href : pathname.startsWith(href)

  return (
    <>
      <nav className="hidden md:block sticky top- z-30 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="max-w- mx-auto px-4 flex gap-7">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              className={`py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive(link.href, link.exact)
                 ? 'text-primary-500 border-primary-500'
                  : 'text-neutral-500 border-transparent hover:text-primary-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </>
  )
}