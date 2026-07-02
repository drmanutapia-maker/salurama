const ROUTE_MAP: Record<string, string> = {
  PO: 'VO',
  IV: 'IV',
  SC: 'SC',
  IM: 'IM',
  IT: 'IT',
  SL: 'SL',
  INH: 'INH',
  TOP: 'TOP',
}

/** Convierte el código de vía de administración al texto de presentación en español.
 *  PO -> VO (vía oral). El resto de códigos se devuelve igual salvo casing. */
export function formatRoute(code: string): string {
  return ROUTE_MAP[code.toUpperCase()] ?? code.toUpperCase()
}
