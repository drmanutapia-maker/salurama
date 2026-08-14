import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 150s: el timeout que le mandamos al navegador (ver TIMEOUT_MS_WEBAUTHN en
// las rutas de opciones) es de 120s, con 30s de margen extra aqui para que
// el reto nunca expire ANTES que la ceremonia misma pueda terminar --
// especialmente importante para el flujo por QR/celular, mas lento que la
// huella local.
const TTL_SEGUNDOS = 150
const PREFIJO = 'webauthn_challenge:'

export async function guardarReto(clave: string, challenge: string): Promise<void> {
  await redis.set(`${PREFIJO}${clave}`, challenge, { ex: TTL_SEGUNDOS })
}

// Un solo uso: al leerlo se borra, para que el mismo reto no pueda
// reutilizarse en un segundo intento (ataque de repeticion).
export async function leerYBorrarReto(clave: string): Promise<string | null> {
  const challenge = await redis.get<string>(`${PREFIJO}${clave}`)
  if (challenge) await redis.del(`${PREFIJO}${clave}`)
  return challenge
}
