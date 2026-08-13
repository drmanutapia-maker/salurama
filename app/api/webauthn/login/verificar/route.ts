import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { rpID, expectedOrigin } from '@/lib/webauthn/config'
import { leerYBorrarReto } from '@/lib/webauthn/challengeStore'
import { hexAUint8Array } from '@/lib/webauthn/bytea'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

const bodySchema = z.object({
  challengeId: z.string().uuid(),
  response: z.record(z.string(), z.any()),
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

  try {
    const ip = getClientIp(request)
    try {
      const count = await redis.incr(`webauthn_login_verify:${ip}`)
      if (count === 1) await redis.expire(`webauthn_login_verify:${ip}`, 900)
      if (count > 20) {
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
    const { challengeId, response } = validation.data

    const expectedChallenge = await leerYBorrarReto(`login:${challengeId}`)
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'El inicio de sesión expiró, intenta de nuevo' }, { status: 400, headers: securityHeaders })
    }

    const credentialId = (response as { id?: string }).id
    if (!credentialId) {
      return NextResponse.json({ error: 'Credencial inválida' }, { status: 400, headers: securityHeaders })
    }

    const { data: fila, error: filaError } = await supabase
      .from('webauthn_credentials')
      .select('id, medico_id, public_key, counter, transports')
      .eq('credential_id', credentialId)
      .maybeSingle()

    if (filaError || !fila) {
      console.warn(`[${requestId}] Credencial no encontrada: ${credentialId}`)
      return NextResponse.json({ error: 'Esta credencial no está registrada' }, { status: 404, headers: securityHeaders })
    }

    const verificacion = await verifyAuthenticationResponse({
      response: response as any,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: credentialId,
        publicKey: hexAUint8Array(fila.public_key),
        counter: fila.counter,
        transports: fila.transports || undefined,
      },
    })

    if (!verificacion.verified) {
      return NextResponse.json({ error: 'No se pudo verificar la credencial' }, { status: 401, headers: securityHeaders })
    }

    const { newCounter } = verificacion.authenticationInfo

    // Muchas passkeys sincronizadas (iCloud Keychain, Google Password Manager)
    // siempre reportan un contador en 0 -- no llevan cuenta de usos por
    // dispositivo. Solo se trata como sospechoso (posible clon) un contador
    // que NO avanza cuando el guardado sí era mayor a 0.
    if (fila.counter > 0 && newCounter <= fila.counter) {
      console.error(`[${requestId}] Contador de firmas no avanzó — posible credencial clonada: ${credentialId}`)
      return NextResponse.json({ error: 'No se pudo verificar la credencial' }, { status: 401, headers: securityHeaders })
    }

    await supabase
      .from('webauthn_credentials')
      .update({ counter: newCounter, last_used_at: new Date().toISOString() })
      .eq('id', fila.id)

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('email')
      .eq('id', fila.medico_id)
      .maybeSingle()

    if (doctorError || !doctor) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404, headers: securityHeaders })
    }

    // No se envía ningún correo -- generateLink solo emite el token, que se
    // devuelve directo al navegador para que lo canjee por una sesión real
    // vía supabase.auth.verifyOtp() (mismo tipo de sesión que el login con
    // contraseña).
    const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: doctor.email,
    })

    if (linkError || !link) {
      console.error(`[${requestId}] Error generando token de sesión:`, linkError)
      return NextResponse.json({ error: 'No se pudo iniciar sesión' }, { status: 500, headers: securityHeaders })
    }

    return NextResponse.json(
      { tokenHash: link.properties.hashed_token },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error verificando login:`, error)
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500, headers: securityHeaders })
  }
}
