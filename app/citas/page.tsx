import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendVerificationEmail } from '@/lib/email'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

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
    const timeoutId = set