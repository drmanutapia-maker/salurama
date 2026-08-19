import geoip from 'geoip-lite'

// Códigos de entidad (ISO 3166-2:MX) que geoip-lite expone en `region`
// cuando no logra resolver una ciudad específica -- sirve de respaldo
// razonable ("Jalisco" en vez de nada) ya que casi todos nuestros médicos
// están en México. No se traduce el resto del mundo: fuera de México, si no
// hay ciudad, se omite en vez de adivinar.
const ESTADOS_MX: Record<string, string> = {
  AGU: 'Aguascalientes', BCN: 'Baja California', BCS: 'Baja California Sur',
  CAM: 'Campeche', CHP: 'Chiapas', CHH: 'Chihuahua', CMX: 'Ciudad de México',
  COA: 'Coahuila', COL: 'Colima', DUR: 'Durango', GUA: 'Guanajuato',
  GRO: 'Guerrero', HID: 'Hidalgo', JAL: 'Jalisco', MEX: 'Estado de México',
  MIC: 'Michoacán', MOR: 'Morelos', NAY: 'Nayarit', NLE: 'Nuevo León',
  OAX: 'Oaxaca', PUE: 'Puebla', QUE: 'Querétaro', ROO: 'Quintana Roo',
  SLP: 'San Luis Potosí', SIN: 'Sinaloa', SON: 'Sonora', TAB: 'Tabasco',
  TAM: 'Tamaulipas', TLA: 'Tlaxcala', VER: 'Veracruz', YUC: 'Yucatán',
  ZAC: 'Zacatecas',
}

// geoip-lite trae los nombres de ciudad en inglés. La gran mayoría de
// ciudades mexicanas se escriben igual en español; solo traducimos los
// casos donde de verdad cambian.
const TRADUCCIONES_CIUDAD: Record<string, string> = {
  'Mexico City': 'Ciudad de México',
}

// Ciudad (o, si no se pudo resolver, estado) aproximada a partir de una IP,
// calculada localmente con geoip-lite -- la IP nunca sale del servidor.
// Devuelve null cuando no se puede calcular con confianza razonable (IPs
// privadas/locales, rangos no reconocidos, país sin ciudad ni tabla de
// respaldo), en vez de adivinar o mostrar la IP cruda.
export function ubicacionAproximadaPorIp(ip: string): string | null {
  const info = geoip.lookup(ip)
  if (!info) return null

  if (info.city) {
    return TRADUCCIONES_CIUDAD[info.city] || info.city
  }

  if (info.country === 'MX' && info.region && ESTADOS_MX[info.region]) {
    return ESTADOS_MX[info.region]
  }

  return null
}
