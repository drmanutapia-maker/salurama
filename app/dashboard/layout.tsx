import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Panel Médico</h1>
            <div className="flex gap-6 text-sm">
              <Link href="/dashboard" className="hover:text-blue-600">Inicio</Link>
              <Link href="/dashboard/citas" className="hover:text-blue-600">Citas</Link>
              <Link href="/dashboard/horario" className="hover:text-blue-600">Mi Horario</Link>
              <Link href="/dashboard/perfil" className="hover:text-blue-600">Perfil</Link>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}