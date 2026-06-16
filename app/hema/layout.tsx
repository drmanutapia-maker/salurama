import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import HemaNav from '@/components/hema/HemaNav'

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

export default async function HemaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // En Server Components solo podemos leer cookies
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  // Segunda capa de seguridad (el middleware es la primera)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?next=/hema')
  }

  const claims = decodeJwtPayload(session.access_token)
  const modules = (claims.modules as string[]) ?? []

  if (!modules.includes('hema')) {
    redirect('/dashboard?upgrade=hema')
  }

  // Leer perfil del médico desde public.doctors
  const { data: doctor } = await supabase
    .from('doctors')
    .select('full_name, specialty, professional_license, photo_url')
    .eq('user_id', session.user.id)
    .maybeSingle()

  const doctorName = doctor?.full_name ?? session.user.email ?? ''
  const specialty = doctor?.specialty ?? ''

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>

      {/* Sub-navegación del módulo HEMA */}
      <HemaNav />

      {/* Contenido del módulo */}
      <div
        style={{
          minHeight: 'calc(100vh - 72px - 49px - 56px)',
          background: '#F8F9FA',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Cabecera contextual del médico — solo visible en desktop */}
        <div
          style={{
            background: '#1E3A5F',
            padding: '10px 16px',
            display: 'none',
          }}
          className="hema-doctor-header"
        >
          <div
            style={{
              maxWidth: 1100,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                color: '#E0E9F4',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {doctorName}
              {specialty && (
                <span style={{ color: '#7EA8C9', fontWeight: 400 }}>
                  {' '}· {specialty}
                </span>
              )}
            </span>
            <span
              style={{
                fontSize: 11,
                color: '#4FC38A',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              ● HEMA Clínico
            </span>
          </div>
        </div>

        {/* Área de contenido */}
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 80px' }}>
          {children}
        </main>
      </div>

      {/* Disclaimer NOM-004 — siempre visible en footer */}
      <footer
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 20,
          background: '#1C2B3A',
          borderTop: '1px solid #2D4460',
          padding: '10px 16px',
        }}
      >
        <p
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            fontSize: 11,
            color: '#7EA8C9',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Herramienta de soporte a la decisión clínica. El médico tratante es el
          único responsable de la prescripción. · NOM-004-SSA3-2012
        </p>
      </footer>

      <style>{`
        @media (min-width: 768px) {
          .hema-doctor-header { display: block !important; }
        }
      `}</style>
    </>
  )
}
