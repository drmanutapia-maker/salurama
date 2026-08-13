// Configuracion del "relying party" de WebAuthn. El rpID debe ser
// EXACTAMENTE el dominio donde corre la ceremonia (sin esquema ni puerto) --
// "localhost" esta exento por el propio estandar de requerir HTTPS, por eso
// se usa aparte en desarrollo/pruebas en vez del dominio real.
const isProd = process.env.NODE_ENV === 'production'

export const rpName = 'Salurama'

export const rpID = isProd
  ? new URL(process.env.NEXT_PUBLIC_URL || 'https://salurama.com').hostname
  : 'localhost'

export const expectedOrigin = isProd
  ? [`https://${rpID}`]
  : ['http://localhost:3000']
