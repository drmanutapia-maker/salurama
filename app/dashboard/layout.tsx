'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    async function load() {
      const { user, networkError } = await getUserSafe(supabase)
      // Fallo de red: no hay forma de saber si hay sesión o no. Se deja el
      // badge como estaba — el intervalo de 60s de abajo reintentará solo.
      if (networkError) return
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
    { href: '/dashboard/msl-virtual', label: 'MSL Virtual' },
  ]

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  // El chat MSL Virtual ocupa el viewport completo con scroll interno propio;
  // este nav (sticky, ocupa espacio en el flujo del documento) no aplica a esas
  // rutas y añadiría altura que empujaría el documento más allá del viewport.
  const isMslVirtual = pathname?.startsWith('/dashboard/msl-virtual')

  return (
    <>
      {!isMslVirtual && (
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
      )}
      {children}
    </>
  )
}