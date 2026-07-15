import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getEstadisticasData } from '@/lib/estadisticasData'
import { buildEstadisticasExcel } from '@/lib/estadisticasExcel'
import { PLAN_TO_TIER_CODE } from '@/lib/pricingTiers'

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

const PREMIUM_TIERS = [PLAN_TO_TIER_CODE.premium, PLAN_TO_TIER_CODE.clinica]

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

  if (!result.pricingTier || !PREMIUM_TIERS.includes(result.pricingTier as any)) {
    return NextResponse.json({ error: 'Los reportes descargables son un beneficio del plan Premium' }, { status: 403 })
  }

  const excelBuffer = await buildEstadisticasExcel(result.data)

  return new NextResponse(new Uint8Array(excelBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="salurama-estadisticas-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
