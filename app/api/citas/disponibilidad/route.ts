import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

export const runtime = 'edge'
export const preferredRegion = 'mex1'

const querySchema = z.object({
  medicoId: z.string().uuid('ID de médico inválido'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
})

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

// Horarios ya ocupados para un médico+fecha — solo devuelve la hora (sin
// nombre, email ni ningún dato del paciente) para que el selector de la
// reserva pública pueda excluirlos, en vez de mostrar como "disponible" un
// horario que ya tiene una cita viva (pending_verification o confirmed).
// El índice único parcial en la base de datos sigue siendo la protección
// real contra doble reserva; esto es solo para que el paciente no tenga
// que chocar contra ese error en el caso normal.
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  try {
    const ip = getClientIp(request)
    try {
      const count = await redis.incr(`citas_disp:${ip}`)
      if (count === 1) await redis.expire(`citas_disp:${ip}`, 60)
      if (count > 60) {
        return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429, headers: securityHeaders })
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    const { searchParams } = new URL(request.url)
    const validation = querySchema.safeParse({
      medicoId: searchParams.get('medicoId'),
      fecha: searchParams.get('fecha'),
    })
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400, headers: securityHeaders })
    }
    const { medicoId, fecha } = validation.data

    const { data, error } = await supabase
      .from('citas')
      .select('hora')
      .eq('medico_id', medicoId)
      .eq('fecha', fecha)
      .in('estado', ['pending_verification', 'confirmed'])

    if (error) {
      console.error(`[${requestId}] Error consultando disponibilidad:`, error)
      return NextResponse.json({ error: 'Error al consultar disponibilidad' }, { status: 500, headers: securityHeaders })
    }

    const ocupadas = [...new Set((data || []).map(c => c.hora.slice(0, 5)))]

    return NextResponse.json({ ocupadas }, { headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al consultar disponibilidad' }, { status: 500, headers: securityHeaders })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
