import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verificarToken } from '@/lib/chat/token'
import { descifrar } from '@/lib/chat/crypto'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const bodySchema = z.object({
  token: z.string().min(1).max(200),
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
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415 })
    }

    const ip = getClientIp(request)

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Enlace inválido' }, { status: 400, headers: securityHeaders })
    }

    const sesion = await verificarToken(supabase, validation.data.token)

    // Solo los intentos con token inválido cuentan contra el presupuesto de
    // adivinanza por IP (10/15min, mismo que mensaje/archivo) — así el polling
    // legítimo de una sesión ya verificada no compite por ese mismo presupuesto.
    // Un token válido consume en cambio una clave propia y más generosa, ligada
    // a la sala (no a la IP), pensada para sostener polling cada pocos segundos.
    const rateKey = sesion ? `chat_poll:${sesion.salaId}` : `chat_token:${ip}`
    const rateLimite = sesion ? 180 : 10

    try {
      const count = await redis.incr(rateKey)
      if (count === 1) await redis.expire(rateKey, 900)
      if (count > rateLimite) {
        console.warn(`[${requestId}] Rate limit exceeded: ${rateKey}`)
        return NextResponse.json(
          { error: 'Demasiados intentos. Intenta en 15 minutos.' },
          { status: 429, headers: { ...securityHeaders, 'Retry-After': '900' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    if (!sesion) {
      console.warn(`[${requestId}] Token no encontrado: ${ip}`)
      return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 404, headers: securityHeaders })
    }

    const [mensajesRes, archivosRes, medicoRes] = await Promise.all([
      supabase
        .from('chat_mensajes')
        .select('id, cita_id, remitente_tipo, contenido, created_at')
        .eq('sala_id', sesion.salaId)
        .order('created_at', { ascending: true }),
      supabase
        .from('chat_archivos')
        .select('id, cita_id, remitente_tipo, storage_path, nombre_original, tipo_mime, tamano_bytes, created_at')
        .eq('sala_id', sesion.salaId)
        .order('created_at', { ascending: true }),
      supabase
        .from('doctors')
        .select('full_name, display_name, photo_url')
        .eq('id', sesion.medicoId)
        .maybeSingle(),
    ])

    if (mensajesRes.error || archivosRes.error) {
      console.error(`[${requestId}] Error leyendo sala:`, mensajesRes.error || archivosRes.error)
      return NextResponse.json({ error: 'Error al cargar la conversación' }, { status: 500, headers: securityHeaders })
    }

    // Un mensaje individual corrupto o cifrado con otra llave no debe tumbar
    // el resto de la conversación — se degrada solo esa fila.
    const mensajesDescifrados = (mensajesRes.data || []).map(m => {
      try {
        return { ...m, contenido: descifrar(m.contenido) }
      } catch (decryptError) {
        console.error(`[${requestId}] Error al descifrar mensaje ${m.id}:`, decryptError)
        return { ...m, contenido: '[mensaje no disponible]' }
      }
    })

    // El separador visual agrupa por cita_id (una sala puede acumular mensajes
    // de varias citas a lo largo del tiempo) — se necesita fecha/hora de cada
    // una, no solo de la cita vigente, igual que hace la vista del médico.
    const citaIds = Array.from(new Set([
      sesion.citaActualId,
      ...mensajesDescifrados.map(m => m.cita_id),
      ...(archivosRes.data || []).map(a => a.cita_id),
    ]))
    const { data: citasData } = await supabase
      .from('citas')
      .select('id, fecha, hora, estado')
      .in('id', citaIds)

    const citaVigente = citasData?.find(c => c.id === sesion.citaActualId)

    return NextResponse.json(
      {
        citaActualId: sesion.citaActualId,
        puedeEscribir: sesion.puedeEscribir,
        mensajes: mensajesDescifrados,
        archivos: archivosRes.data,
        medicoNombre: medicoRes.data?.display_name || medicoRes.data?.full_name || null,
        medicoFotoUrl: medicoRes.data?.photo_url || null,
        citaFecha: citaVigente?.fecha || null,
        citaHora: citaVigente?.hora || null,
        citaEstado: citaVigente?.estado || null,
        citas: citasData || [],
      },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
