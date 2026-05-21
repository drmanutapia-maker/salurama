import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

// Mapa en memoria para rate-limiting básico por IP
// En producción debería usar Redis u otro store distribuido
const attempts: Map<string, { count: number; resetAt: number }> = new Map()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  if (entry.count > MAX_ATTEMPTS) return true
  return false
}

export async function POST(request: Request) {
  const ip = getClientIp(request)

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Demasiados intentos. Espera 15 minutos.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { password } = body

    if (typeof password !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
    }

    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return NextResponse.json({ ok: false, error: 'Admin not configured' }, { status: 500 })
    }

    // Comparación en tiempo constante para evitar timing attacks
    const inputBuf = Buffer.from(password.padEnd(adminPassword.length))
    const adminBuf = Buffer.from(adminPassword)
    const isValid =
      inputBuf.length === adminBuf.length &&
      timingSafeEqual(inputBuf, adminBuf)

    if (isValid) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false }, { status: 401 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }
}
