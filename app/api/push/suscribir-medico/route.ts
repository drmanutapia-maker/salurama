import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { endpointPushPermitido } from '@/lib/push/allowlist'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const bodySchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
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

// Guarda (o actualiza) la suscripción push de un médico. A diferencia de
// /api/push/suscribir (pacientes, identificados por token de chat), el
// médico tiene sesión real de Supabase Auth -- se identifica con el Bearer
// token, mismo patrón que /api/citas/rechazar.
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: securityHeaders })
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: securityHeaders })
    }

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415, headers: securityHeaders })
    }

    const ip = getClientIp(request)
    const rateKey = `push_suscribir_medico:${ip}`
    try {
      const count = await redis.incr(rateKey)
      if (count === 1) await redis.expire(rateKey, 900)
      if (count > 20) {
        console.warn(`[${requestId}] Rate limit exceeded: ${rateKey}`)
        return NextResponse.json(
          { error: 'Demasiados intentos. Intenta en 15 minutos.' },
          { status: 429, headers: { ...securityHeaders, 'Retry-After': '900' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400, headers: securityHeaders })
    }

    const { data: medico } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!medico) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 403, headers: securityHeaders })
    }

    const { subscription } = validation.data

    // Rechazar antes de tocar la base de datos -- ver lib/push/allowlist.ts.
    if (!endpointPushPermitido(subscription.endpoint)) {
      console.warn(`[${requestId}] Endpoint push rechazado (host no permitido): ${subscription.endpoint}`)
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400, headers: securityHeaders })
    }

    const { error } = await supabase
      .from('doctor_push_subscriptions')
      .upsert(
        {
          medico_id: medico.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: request.headers.get('user-agent') || null,
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error(`[${requestId}] Error guardando suscripción:`, error)
      return NextResponse.json({ error: 'No se pudo guardar la suscripción' }, { status: 500, headers: securityHeaders })
    }

    return NextResponse.json({ success: true }, { headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
