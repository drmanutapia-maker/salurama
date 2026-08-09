'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { isManuelEmail } from '@/lib/manuelOnly'
import { contarMensajesSinLeerTotal, EVENTO_CHAT_LEIDO } from '@/lib/chat/sinLeer'
import {
  Search, Heart, Calendar, User,
  Home, Clock, MessageCircle, MessageCircleQuestion
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Role = 'doctor' | 'patient' | null
type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number }

export default function BottomNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<Role>(null)
  const [isManuel, setIsManuel] = useState(false)
  const [sinLeer, setSinLeer] = useState(0)

  useEffect(() => {
    let mounted = true

    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      // OPCIÓN A: sin usuario = sin BottomNav
      if (!user) {
        if (mounted) { setRole(null); setIsManuel(false) }
        return
      }

      if (mounted) setIsManuel(isManuelEmail(user.email))

      const { data } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (mounted) setRole(data ? 'doctor' : 'patient')
      if (mounted && data) setSinLeer(await contarMensajesSinLeerTotal(data.id))
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

    // Refrescar el contador de mensajes cada 60 segundos (respaldo) y también
    // justo cuando el médico abre una conversación y se marca como leída
    // (ver ConversacionChat.tsx) — mismo criterio que app/dashboard/layout.tsx.
    const interval = setInterval(checkRole, 60000)
    window.addEventListener(EVENTO_CHAT_LEIDO, checkRole)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearInterval(interval)
      window.removeEventListener(EVENTO_CHAT_LEIDO, checkRole)
    }
  }, [])

  // No renderiza nada hasta saber el rol, y nunca en logout
  if (!role) return null

  const doctorNav: NavItem[] = [
    { href: '/dashboard', label: 'Inicio', icon: Home, exact: true },
    { href: '/dashboard/horario', label: 'Horarios', icon: Clock },
    { href: '/dashboard/citas', label: 'Citas', icon: Calendar },
    { href: '/dashboard/chat', label: 'Chat', icon: MessageCircle, badge: sinLeer },
    // MSL Virtual: oculto salvo para la cuenta de Manuel — ver lib/manuelOnly.ts
    ...(isManuel ? [{ href: '/dashboard/msl-virtual', label: 'MSL', icon: MessageCircleQuestion }] : []),
  ]

  const patientNav: NavItem[] = [
    { href: '/buscar', label: 'Buscar', icon: Search },
    { href: '/citas', label: 'Citas', icon: Calendar },
    { href: '/perfil', label: 'Perfil', icon: User },
  ]

  const items = role === 'doctor' ? doctorNav : patientNav
  const activeColor = role === 'doctor' ? 'text-primary-500' : 'text-secondary-500'
  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href))

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`relative flex flex-col items-center justify-center py-2.5 px-3 min-w- transition-colors ${active ? activeColor : 'text-neutral-500'}`}
            >
              <span className="relative inline-flex">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {!!item.badge && item.badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full bg-red-600 text-white font-bold"
                    style={{ minWidth: 16, height: 16, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}
                  >
                    {item.badge}
                  </span>
                )}
              </span>
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
