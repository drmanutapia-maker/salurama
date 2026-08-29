import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verifyTurnstile } from '@/lib/security'
import { moderarContenido } from '@/lib/moderacion'
import { notificarMedicoPush } from '@/lib/push/enviarPush'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const bodySchema = z.object({
  token: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  turnstileToken: z.string().min(1),
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

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    const ip = getClientIp(request)
    const rateKey = `verify_review_submit:${ip}`

    try {
      const count = await redis.incr(rateKey)
      if (count === 1) await redis.expire(rateKey, 3600)
      if (count > 10) {
        console.warn(`[${requestId}] Rate limit exceeded: ${ip}`)
        return NextResponse.json(
          { error: 'Demasiados intentos. Intenta en 1 hora.' },
          { status: 429, headers: { ...securityHeaders, 'Retry-After': '3600' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400, headers: securityHeaders })
    }
    const { token, rating, comment, turnstileToken } = validation.data

    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return NextResponse.json({ error: 'Verificación fallida' }, { status: 400, headers: securityHeaders })
    }

    // Mismo query que /api/verify-review/lookup — el token se revalida aquí,
    // en el momento de insertar, en vez de confiar en que el cliente ya lo
    // validó en un paso anterior.
    const { data: cita, error: citaError } = await supabase
      .from('citas')
      .select('id, medico_id')
      .eq('review_token', token)
      .eq('estado', 'completed')
      .maybeSingle()

    if (citaError || !cita) {
      return NextResponse.json(
        { error: 'Este enlace ya fue usado, expiró o es inválido' },
        { status: 404, headers: securityHeaders }
      )
    }

    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('cita_id', cita.id)
      .maybeSingle()

    if (existingReview) {
      return NextResponse.json(
        { error: 'Ya enviaste una reseña para esta cita. ¡Gracias!' },
        { status: 409, headers: securityHeaders }
      )
    }

    const { data: nuevaReview, error: insertError } = await supabase
      .from('reviews')
      .insert({
        doctor_id: cita.medico_id,
        rating,
        comment: comment || null,
        is_visible: true,
        cita_id: cita.id,
      })
      .select('id')
      .single()

    if (insertError) {
      // 23505 = unique_violation (reviews_cita_id_key) — respaldo ante una
      // carrera con otra solicitud concurrente para la misma cita.
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Ya enviaste una reseña para esta cita. ¡Gracias!' },
          { status: 409, headers: securityHeaders }
        )
      }
      console.error(`[${requestId}] Error insertando reseña:`, insertError)
      return NextResponse.json({ error: 'Error al guardar la reseña' }, { status: 500, headers: securityHeaders })
    }

    console.info(`[${requestId}] Reseña creada para cita ${cita.id}`)

    // Solo si hay texto que evaluar — un rating sin comentario no puede
    // violar ninguna regla de contenido. Se espera aquí (no fire-and-forget)
    // porque el proceso ya termina justo después; nunca bloquea ni revierte
    // la publicación, solo escribe el veredicto para la bandeja del admin.
    if (comment) {
      await moderarContenido(supabase, 'review', nuevaReview.id, comment)
    }

    await notificarMedicoPush(supabase, cita.medico_id, {
      title: 'Nueva reseña',
      body: `Recibiste una reseña de ${rating} estrella${rating === 1 ? '' : 's'}.`,
      url: `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/dashboard/resenas`,
    })

    return NextResponse.json(
      { success: true, medicoId: cita.medico_id },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
