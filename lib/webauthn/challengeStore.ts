import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const TTL_SEGUNDOS = 120 // mismo margen que el timeout que se le manda al navegador (ver rutas)
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
