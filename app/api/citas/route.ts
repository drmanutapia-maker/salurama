import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendVerificationEmail } from '@/lib/email'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

export const runtime = 'edge'
export const preferredRegion = 'mex1'

const citaSchema = z.object({
  medicoId: z.string().uuid('ID de médico inválido'),
  pacienteNombre: z.string().trim().min(2).max(100).regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Nombre inválido'),
  pacienteEmail: z.string().email().toLowerCase().max(254),
  pacienteTelefono: z.string().regex(/^\+?[\d\s\-\(\)]{10,20}$/, 'Teléfono inválido').optional().or(z.literal('')),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  hora: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora inválida'),
  motivo: z.string().trim().max(500).optional(),
  turnstileToken: z.string().min(1),
})

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

export async function POST(request: NextRequest) {
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

  if (!process.env.TURNSTILE_SECRET_KEY ||!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error(`[${requestId}] Missing env vars`)
    return NextResponse.json({ error: 'Configuración inválida' }, { status: 500 })
  }

  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415 })
    }

    const ip = getClientIp(request)
    const body = await request.json()
    const rateKey = `citas:${ip}:${body.medicoId || 'unknown'}`

    try {
      const count = await redis.incr(rateKey)
      if (count === 1) await redis.expire(rateKey, 3600)
      if (count > 5) {
        console.warn(`[${requestId}] Rate limit exceeded: ${ip}`)
        return NextResponse.json(
          { error: 'Demasiadas solicitudes. Intenta en 1 hora.' },
          { status: 429, headers: { 'Retry-After': '3600' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    const validation = citaSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { medicoId, pacienteNombre, pacienteEmail, pacienteTelefono, fecha, hora, motivo, turnstileToken } = validation.data

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY!,
          response: turnstileToken,
          remoteip: ip,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const turnstileData = await turnstileRes.json()
      if (!turnstileData.success) {
        console.warn(`[${requestId}] Turnstile failed: ${ip}`)
        return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 })
      }
    } catch (e) {
      clearTimeout(timeoutId)
      console.error(`[${requestId}] Turnstile error:`, e)
      return NextResponse.json({ error: 'Error de verificación' }, { status: 400 })
    }

    const citaDate = new Date(`${fecha}T${hora}:00-06:00`)
    const now = new Date()

    if (isNaN(citaDate.getTime())) {
      return NextResponse.json({ error: 'Fecha/hora inválida' }, { status: 400 })
    }

    if (citaDate < now) {
      return NextResponse.json({ error: 'No puedes agendar en el pasado' }, { status: 400 })
    }

    const maxDate = new Date(now.getTime() + 90 * 24 * 3600000)
    if (citaDate > maxDate) {
      return NextResponse.json({ error: 'Máximo 90 días de anticipación' }, { status: 400 })
    }

    const { data: medico, error: medicoError } = await supabase
     .from('doctors')
     .select('id, full_name, horario')
     .eq('id', medicoId)
     .eq('is_active', true)
     .single()

    if (medicoError ||!medico) {
      console.warn(`[${requestId}] Médico no encontrado: ${medicoId}`)
      return NextResponse.json({ error: 'Médico no disponible' }, { status: 404 })
    }

    const dayOfWeek = citaDate.getDay()
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
    const dayName = days[dayOfWeek]
    const horarioDia = medico.horario?.[dayName]

    const diaActivo = horarioDia?.abierto ?? horarioDia?.open ?? horarioDia?.activo ?? !!(horarioDia?.inicio && horarioDia?.fin)
    if (!diaActivo) {
      return NextResponse.json({ error: 'Horario no disponible' }, { status: 400 })
    }

    const [horaH, horaM] = hora.split(':').map(Number)
    const citaMinutos = horaH * 60 + horaM
    const [inicioH, inicioM] = horarioDia.inicio.split(':').map(Number)
    const [finH, finM] = horarioDia.fin.split(':').map(Number)

    if (citaMinutos < inicioH * 60 + inicioM || citaMinutos >= finH * 60 + finM) {
      return NextResponse.json({ error: 'Horario no disponible' }, { status: 400 })
    }

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()

    const [existing, conflicto] = await Promise.all([
      supabase
       .from('citas')
       .select('id', { count: 'exact', head: true })
       .eq('paciente_email', pacienteEmail)
       .eq('medico_id', medicoId)
       .eq('estado', 'pending_verification')
       .gte('created_at', oneHourAgo),
      supabase
       .from('citas')
       .select('id', { count: 'exact', head: true })
       .eq('medico_id', medicoId)
       .eq('fecha', fecha)
       .eq('hora', hora)
       .in('estado', ['confirmed', 'pending_doctor']),
    ])

    if (existing.count && existing.count > 0) {
      return NextResponse.json(
        { error: 'Ya tienes una cita pendiente. Revisa tu email.' },
        { status: 400 }
      )
    }

    if (conflicto.count && conflicto.count > 0) {
      return NextResponse.json(
        { error: 'Horario ocupado. Elige otro.' },
        { status: 400 }
      )
    }

    const verificationToken = crypto.randomUUID()
    const { data: cita, error } = await supabase
      .from('citas')
      .insert({
        medico_id: medicoId,
        paciente_nombre: pacienteNombre,
        paciente_email: pacienteEmail,
        paciente_telefono: pacienteTelefono || null,
        fecha,
        hora: hora + ':00',
        motivo: motivo || null,
        estado: 'pending_verification',
        verification_token: verificationToken,
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
        ip_address: ip,
      })
      .select('id')
      .single()

    if (error) throw error

    try {
      await sendVerificationEmail(
        pacienteEmail,
        verificationToken,
        medico.full_name,
        `${fecha} a las ${hora}`
      )
    } catch (emailError) {
      console.error(`[${requestId}] Email failed:`, emailError)
    }

    console.info(`[${requestId}] Cita creada: ${cita.id} para ${medicoId}`)

    return NextResponse.json(
      { success: true, message: 'Revisa tu email para confirmar.', citaId: cita.id },
      {
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      }
    )

  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}