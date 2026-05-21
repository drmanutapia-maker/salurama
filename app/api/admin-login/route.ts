import { NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'crypto'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const key = `admin_attempts:${ip}`

  // Rate limiting con Redis (funciona en serverless)
  const attempts = await redis.incr(key)
  if (attempts === 1) await redis.expire(key, 900) // 15 min
  if (attempts > MAX_ATTEMPTS) {
    return NextResponse.json(
      { ok: false, error: 'Demasiados intentos' },
      { status: 429 }
    )
  }

  try {
    const { password, turnstileToken } = await request.json()

    // Añade Turnstile aquí también
    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${turnstileToken}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    if (!(await turnstileRes.json()).success) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH // ← Cambia esto en Vercel

    // Compara hashes, no texto plano
    const inputHash = createHash('sha256').update(password).digest('hex')
    const isValid = timingSafeEqual(
      Buffer.from(inputHash),
      Buffer.from(adminPasswordHash || '')
    )

    if (isValid) {
      await redis.del(key) // Resetea intentos

      // Crea sesión segura
      const sessionToken = crypto.randomUUID()
      await redis.set(`admin_session:${sessionToken}`, ip, { ex: 86400 }) // 24h

      const response = NextResponse.json({ ok: true })
      response.cookies.set('admin_session', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 86400,
        path: '/admin'
      })
      return response
    }

    return NextResponse.json({ ok: false }, { status: 401 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}