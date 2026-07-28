import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getEstadisticasData } from '@/lib/estadisticasData'
import { isPremiumTier } from '@/lib/planGates'

export const dynamic = 'force-dynamic'

async function getAnonSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {}
        },
      },
    }
  )
}

// El benchmark solo agrega números (ver lib/estadisticasData.ts), pero
// sigue siendo un beneficio Premium — se gatea aquí igual que los reportes
// descargables, no solo en la UI, para que no baste con inspeccionar la
// red para saltarse el candado.
export async function GET() {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const result = await getEstadisticasData(user.id)
  if (!result) {
    return NextResponse.json({ error: 'Perfil de médico no encontrado' }, { status: 404 })
  }

  if (!isPremiumTier(result.pricingTier)) {
    return NextResponse.json({ error: 'El benchmark de especialidad es un beneficio del plan Premium' }, { status: 403 })
  }

  return NextResponse.json({ benchmark: result.data.benchmark })
}
