'use client'
import { usePathname } from 'next/navigation'

// El Navbar fijo (68px) se oculta en /chat/[token] (ver Navbar.tsx) — sin él,
// reservar ese espacio dejaría una franja vacía arriba de una pantalla que
// debe ocupar el viewport completo.
export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const sinNavbar = pathname?.startsWith('/chat/')

  return (
    <main style={{ paddingTop: sinNavbar ? 0 : '68px', minHeight: '100svh' }}>
      {children}
    </main>
  )
}
