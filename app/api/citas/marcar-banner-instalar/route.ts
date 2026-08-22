import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const runtime = 'edge'
export const preferredRegion = 'mex1'

const bodySchema = z.object({
  pacienteId: z.string().uuid('ID de paciente inválido'),
})

// Marca que a esta cuenta de paciente ya se le mostró el banner de
// "instalar como app" -- se llama una sola vez, justo cuando
// InstalarAppBanner confirma que sí había algo que mostrar (ver
// components/InstalarAppBanner.tsx). El update es atómico contra el valor
// actual (eq pwa_banner_shown=false) para que llamadas repetidas o
// simultáneas no hagan nada distinto de la primera.
export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415 })
    }

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    await supabase
      .from('pacientes')
      .update({ pwa_banner_shown: true })
      .eq('id', validation.data.pacienteId)
      .eq('pwa_banner_shown', false)

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[marcar-banner-instalar] Error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}
