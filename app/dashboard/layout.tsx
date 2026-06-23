'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: medico } = await supabase.from('doctors').select('id').eq('user_id', user.id).single()
      if (!medico) return
      const { count } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('medico_id', medico.id)
        .eq('estado', 'pending_verification')
        .gte('expires_at', new Date().toISOString())
      setPendientes(count || 0)
    }
    load()
    
    // Refrescar cada 60 segundos
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  const links = [
    { href: '/dashboard', label: 'Inicio', exact: true },
    { href: '/dashboard/horario', label: 'Horarios' },
    { href: '/dashboard/citas', label: 'Citas', badge: pendientes },
    { href: '/dashboard/estadisticas', label: 'Estadísticas' },
  ]

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <>
      <nav className="hidden md:block sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 flex gap-7">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              className={`py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                isActive(link.href, link.exact)
                  ? 'text-primary-500 border-primary-500'
                  : 'text-neutral-500 border-transparent hover:text-primary-700'
              }`}
            >
              {link.label}
              {link.badge != null && link.badge > 0 && (
                <span style={{ background: '#DC2626', color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700, lineHeight: '18px' }}>
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </>
  )
}