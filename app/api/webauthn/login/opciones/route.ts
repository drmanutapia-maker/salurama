import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { rpIDDesdeRequest, TIMEOUT_MS_WEBAUTHN } from '@/lib/webauthn/config'
import { guardarReto } from '@/lib/webauthn/challengeStore'

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

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

// No requiere sesion -- es justo el punto de partida del login. Se usan
// credenciales "discoverable": no se le pide correo al medico, el propio
// navegador le ofrece elegir entre las passkeys que tiene guardadas para
// este sitio (mismo criterio que el atajo experimental de Supabase que se
// investigo antes, ver auth.passkey docs).
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const ip = getClientIp(request)
    try {
      const count = await redis.incr(`webauthn_login_opts:${ip}`)
      if (count === 1) await redis.expire(`webauthn_login_opts:${ip}`, 900)
      if (count > 20) {
        return NextResponse.json(
          { error: 'Demasiados intentos. Intenta en 15 minutos.' },
          { status: 429, headers: { ...securityHeaders, 'Retry-After': '900' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    // El boton en /login ahora solo aparece cuando este navegador ya sabe
    // (via localStorage, ver lib/webauthn/dispositivoLocal.ts) cual es su
    // propia credencial -- se manda ese id para que el navegador vaya
    // directo a ella, sin ambiguedad. Si no llega (llamada sin ese dato),
    // se cae al modo "discoverable" anterior como respaldo.
    const body = await request.json().catch(() => null)
    const credentialId = body?.credentialId
    const idValido = typeof credentialId === 'string' && /^[A-Za-z0-9_-]{16,256}$/.test(credentialId)

    const options = await generateAuthenticationOptions({
      rpID: rpIDDesdeRequest(request),
      userVerification: 'preferred',
      timeout: TIMEOUT_MS_WEBAUTHN,
      allowCredentials: idValido ? [{ id: credentialId }] : undefined,
    })

    const challengeId = crypto.randomUUID()
    await guardarReto(`login:${challengeId}`, options.challenge)

    return NextResponse.json(
      { options, challengeId },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error generando opciones de login:`, error)
    return NextResponse.json({ error: 'Error al preparar el inicio de sesión' }, { status: 500, headers: securityHeaders })
  }
}
