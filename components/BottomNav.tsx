'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  Search, Heart, Calendar, User,
  Home, Clock, BarChart3, MessageCircleQuestion
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Role = 'doctor' | 'patient' | null
type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean }

export default function BottomNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<Role>(null)

  useEffect(() => {
    let mounted = true

    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      // OPCIÓN A: sin usuario = sin BottomNav
      if (!user) {
        if (mounted) setRole(null)
        return
      }

      const { data } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (mounted) setRole(data ? 'doctor' : 'patient')
    }

    checkRole()

    // Escucha login/logout en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setRole(null) // logout → oculta inmediatamente
      } else {
        checkRole() // login → recalcula rol
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // No renderiza nada hasta saber el rol, y nunca en logout
  if (!role) return null

  const doctorNav: NavItem[] = [
    { href: '/dashboard', label: 'Inicio', icon: Home, exact: true },
    { href: '/dashboard/horario', label: 'Horarios', icon: Clock },
    { href: '/dashboard/citas', label: 'Citas', icon: Calendar },
    { href: '/dashboard/estadisticas', label: 'Stats', icon: BarChart3 },
    { href: '/dashboard/msl-virtual', label: 'MSL', icon: MessageCircleQuestion },
  ]

  const patientNav: NavItem[] = [
    { href: '/buscar', label: 'Buscar', icon: Search },
    { href: '/favoritos', label: 'Favoritos', icon: Heart },
    { href: '/citas', label: 'Citas', icon: Calendar },
    { href: '/perfil', label: 'Perfil', icon: User },
  ]

  const items = role === 'doctor' ? doctorNav : patientNav
  const activeColor = role === 'doctor' ? 'text-primary-500' : 'text-secondary-500'
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex flex-col items-center justify-center py-2.5 px-3 min-w- transition-colors ${active ? activeColor : 'text-neutral-500'}`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className={`text- mt-1 ${active ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}