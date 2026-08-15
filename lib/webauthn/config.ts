import type { NextRequest } from 'next/server'

// Configuracion del "relying party" de WebAuthn. El rpID debe ser
// EXACTAMENTE el dominio donde corre la ceremonia (sin esquema ni puerto) --
// "localhost" esta exento por el propio estandar de requerir HTTPS, por eso
// se usa aparte en desarrollo/pruebas en vez del dominio real.
const isProd = process.env.NODE_ENV === 'production'

export const rpName = 'Salurama'

const rpIDProd = new URL(process.env.NEXT_PUBLIC_URL || 'https://salurama.com').hostname
const expectedOriginProd = [`https://${rpIDProd}`]

export const rpID = isProd ? rpIDProd : 'localhost'
export const expectedOrigin = isProd ? expectedOriginProd : ['http://localhost:3000']

// El default de la libreria es 60s -- poco para el flujo por QR/celular
// (desbloquear el telefono, abrir camara, escanear, confirmar). El reto en
// Redis (ver challengeStore.ts) se guarda con mas margen que esto.
export const TIMEOUT_MS_WEBAUTHN = 120000

// En produccion el rpID/origen son fijos -- nunca hay que confiar en lo que
// mande el navegador para esto (permitirlo abriria la puerta a que alguien
// arme una ceremonia contra un dominio ajeno). Pero en desarrollo, probar
// desde un aparato real conectado por un tunel (tipo *.devtunnels.ms,
// *.ngrok.io) hace que el dominio real ya NO sea "localhost" -- el
// navegador rechaza la ceremonia entera con SecurityError, sin llegar
// siquiera a pedir la huella, porque "localhost" no es el dominio real de
// esa pagina. Confirmado con una reproduccion aislada: mismo puerto, sola
// que el hostname sea distinto a "localhost" (ej. "127.0.0.1") ya alcanza
// para que el navegador rechace con "This is an invalid domain." Por eso
// en desarrollo se usa el origen real de cada solicitud en vez de un valor
// fijo -- no hay usuarios ajenos pegandole al servidor de desarrollo de
// alguien, asi que confiar en el Origin real ahi es seguro.
export function rpIDDesdeRequest(request: NextRequest): string {
  if (isProd) return rpIDProd
  const origin = request.headers.get('origin')
  if (!origin) return rpID
  try {
    return new URL(origin).hostname
  } catch {
    return rpID
  }
}

export function expectedOriginDesdeRequest(request: NextRequest): string[] {
  if (isProd) return expectedOriginProd
  const origin = request.headers.get('origin')
  return origin ? [origin] : expectedOrigin
}
