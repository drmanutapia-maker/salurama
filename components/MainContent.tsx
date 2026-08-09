'use client'
import { usePathname } from 'next/navigation'

// El Navbar fijo (68px) se oculta en /chat/[token] (ver Navbar.tsx) — sin él,
// reservar ese espacio dejaría una franja vacía arriba de una pantalla que
// debe ocupar el viewport completo. /chat/recuperar sí lleva Navbar (ver
// misma excepción en Navbar.tsx/Footer.tsx), así que necesita su padding.
export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const sinNavbar = pathname?.startsWith('/chat/') && pathname !== '/chat/recuperar'

  return (
    <main style={{ paddingTop: sinNavbar ? 0 : '68px', minHeight: '100svh' }}>
      {children}
    </main>
  )
}
