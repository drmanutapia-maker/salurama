// Nombre para mostrarle al medico en /dashboard/seguridad -- heuristica
// simple a partir del User-Agent al momento del registro, no pretende ser
// un parser exhaustivo, solo algo reconocible ("Chrome en Windows").
export function nombreDeDispositivo(userAgent: string | null): string {
  if (!userAgent) return 'Dispositivo desconocido'

  let so = 'dispositivo'
  if (/iphone/i.test(userAgent)) so = 'iPhone'
  else if (/ipad/i.test(userAgent)) so = 'iPad'
  else if (/android/i.test(userAgent)) so = 'Android'
  else if (/mac os x/i.test(userAgent)) so = 'Mac'
  else if (/windows/i.test(userAgent)) so = 'Windows'
  else if (/linux/i.test(userAgent)) so = 'Linux'

  let navegador = ''
  if (/edg\//i.test(userAgent)) navegador = 'Edge'
  else if (/chrome\//i.test(userAgent)) navegador = 'Chrome'
  else if (/crios\//i.test(userAgent)) navegador = 'Chrome'
  else if (/fxios\//i.test(userAgent)) navegador = 'Firefox'
  else if (/firefox\//i.test(userAgent)) navegador = 'Firefox'
  else if (/safari\//i.test(userAgent)) navegador = 'Safari'

  return navegador ? `${navegador} en ${so}` : so
}
