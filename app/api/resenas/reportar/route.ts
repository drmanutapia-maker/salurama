import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verificarToken } from '@/lib/chat/token'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const bodySchema = z.object({
  tipo: z.enum(['review', 'review_response']),
  id: z.string().uuid(),
  chatToken: z.string().min(1).max(200).optional(),
})

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// Reporte de reseña — requiere un chatToken válido que pruebe que el
// reportador tuvo al menos una cita con el médico cuya reseña reporta.
// Mantiene rate limiting por IP como capa adicional.
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415, headers: securityHeaders })
    }

    const ip = getClientIp(request)
    const rateKey = `resenas_reportar:${ip}`

    try {
      const count = await redis.incr(rateKey)
      if (count === 1) await redis.expire(rateKey, 3600)
      if (count > 10) {
        console.warn(`[${requestId}] Rate limit exceeded: ${ip}`)
        return NextResponse.json(
          { error: 'Demasiados reportes. Intenta en 1 hora.' },
          { status: 429, headers: { ...securityHeaders, 'Retry-After': '3600' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    const validation = bodySchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400, headers: securityHeaders })
    }
    const { tipo, id, chatToken } = validation.data

    // Requiere un chat token válido que pruebe que el reportador tuvo contacto con este médico
    if (!chatToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401, headers: securityHeaders })
    }
    const sesion = await verificarToken(supabase, chatToken)
    if (!sesion) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403, headers: securityHeaders })
    }

    // Verificar que la reseña pertenece al mismo médico que el chat token
    const tabla = tipo === 'review' ? 'reviews' : 'review_responses'
    const { data: itemOwner } = await supabase
      .from(tabla)
      .select('doctor_id')
      .eq('id', id)
      .maybeSingle()
    if (!itemOwner) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404, headers: securityHeaders })
    }
    if (itemOwner.doctor_id !== sesion.medicoId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403, headers: securityHeaders })
    }

    const { data, error } = await supabase
      .from(tabla)
      .update({
        moderation_status: 'señalado',
        moderation_reason: 'Reportado por un usuario del sitio',
        moderation_flagged_by: 'usuario',
        moderation_reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error(`[${requestId}] Error reportando ${tipo} ${id}:`, error)
      return NextResponse.json({ error: 'Error al procesar el reporte' }, { status: 500, headers: securityHeaders })
    }
    if (!data) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404, headers: securityHeaders })
    }

    return NextResponse.json({ success: true }, { headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: securityHeaders })
  }
}
