'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

// Cola de banners de "acción sugerida" en /dashboard: a lo más UNO visible a
// la vez, para no empujar el contenido real fuera de la pantalla en celular
// (antes competían hasta 4 al mismo tiempo: huella, notificaciones push,
// instalar app, COFEPRIS). Prioridad fija, regla de producto ya decidida
// (ver /areas/salurama.md) -- menor número = mayor prioridad.
//
// El banner de cookies/consentimiento queda FUERA de esta cola a propósito:
// es obligación legal, no una sugerencia de producto, y no debe competir ni
// esperar turno.
export const PRIORIDAD_BANNERS = {
  biometrico: 1,
  push: 2,
  instalarApp: 3,
  cofepris: 4,
} as const

export type BannerId = keyof typeof PRIORIDAD_BANNERS

// Margen de espera antes de asentarse en una decisión -- se aplica en DOS
// momentos, no solo al montar:
//   1) Antes de mostrar el primer banner de la vida de la cola (deja que la
//      persona vea el contenido real de /dashboard primero, en vez de
//      recibir un aviso en el instante que entra).
//   2) Cada vez que el banner activo libera su turno (se cierra/completa) Y
//      el candidato natural que queda es de MENOR prioridad (o no hay
//      ninguno todavía) -- sin este margen, un banner de mayor prioridad
//      que solo tarda un poco más en resolver su propia condición (ej.
//      COFEPRIS esperando su propio fetch a `doctors` en page.tsx, en un
//      componente distinto del layout) puede quedar fuera de la cola para
//      siempre aunque sí tenía algo que mostrar -- confirmado como causa
//      real de un banner que nunca apareció en producción.
// Una MEJORA (candidato de mayor prioridad que el activo actual) nunca
// espera este margen -- se aplica de inmediato, igual que antes.
const RETRASO_INICIAL_MS = 1500

interface ColaBanneresContextValue {
  registrar: (id: BannerId, listo: boolean) => void
  activo: BannerId | null
}

const ColaBanneresContext = createContext<ColaBanneresContextValue | null>(null)

function prioridadDe(id: BannerId | null): number {
  return id ? PRIORIDAD_BANNERS[id] : Infinity
}

// Ganador "en crudo": el de mayor prioridad entre los que YA registraron
// listo=true en este instante -- ignora por completo el margen de espera,
// eso lo decide quien llama a esta función.
function calcularGanadorCrudo(listos: Partial<Record<BannerId, boolean>>): BannerId | null {
  let ganador: BannerId | null = null
  let mejorPrioridad = Infinity
  for (const id of Object.keys(listos) as BannerId[]) {
    if (listos[id] && PRIORIDAD_BANNERS[id] < mejorPrioridad) {
      mejorPrioridad = PRIORIDAD_BANNERS[id]
      ganador = id
    }
  }
  return ganador
}

export function ColaBanneresProvider({ children }: { children: React.ReactNode }) {
  const [listos, setListos] = useState<Partial<Record<BannerId, boolean>>>({})
  const [activo, setActivo] = useState<BannerId | null>(null)
  // Distingue "ya se tomó al menos una decisión real" (para no tratar el
  // estado inicial `activo=null` como si fuera una mejora sobre cualquier
  // candidato -- la primera decisión SIEMPRE espera el margen, igual que
  // cualquier degradación posterior).
  const decididoAlgunaVez = useRef(false)

  const registrar = useCallback((id: BannerId, listo: boolean) => {
    setListos(prev => (prev[id] === listo ? prev : { ...prev, [id]: listo }))
  }, [])

  useEffect(() => {
    const ganadorCrudo = calcularGanadorCrudo(listos)
    if (ganadorCrudo === activo) return

    const esMejora = decididoAlgunaVez.current && prioridadDe(ganadorCrudo) < prioridadDe(activo)

    if (esMejora) {
      decididoAlgunaVez.current = true
      setActivo(ganadorCrudo)
      return
    }

    // Primera decisión de la cola, o una degradación (el activo se liberó y
    // lo mejor disponible ahora es peor o no hay nada todavía) -- espera el
    // margen completo. Si `listos` vuelve a cambiar durante la espera (ej.
    // un banner de mayor prioridad termina de registrar su valor real), el
    // cleanup cancela este timer y el efecto se re-evalúa desde cero.
    const t = setTimeout(() => {
      decididoAlgunaVez.current = true
      setActivo(ganadorCrudo)
    }, RETRASO_INICIAL_MS)
    return () => clearTimeout(t)
  }, [listos, activo])

  const value = useMemo(() => ({ registrar, activo }), [registrar, activo])

  return <ColaBanneresContext.Provider value={value}>{children}</ColaBanneresContext.Provider>
}

// Cada banner llama esto con su propio id fijo y su condición actual de
// "tengo algo que mostrar" -- esa condición es exactamente la misma que cada
// banner ya calculaba antes de existir esta cola, sin tocar. Lo único que
// agrega este hook es EL TURNO: devuelve true solo para el banner de mayor
// prioridad entre los que están listos en este momento, y solo después del
// retraso inicial. Mientras un banner espera su turno (listo=true pero
// activo !== id), quien lo llama NO debe marcar nada como "visto" en la
// base de datos -- solo debe hacerlo cuando esto regresa true.
export function useColaBanners(id: BannerId, listo: boolean): boolean {
  const ctx = useContext(ColaBanneresContext)
  if (!ctx) {
    throw new Error('useColaBanners debe usarse dentro de <ColaBanneresProvider>')
  }
  const { registrar, activo } = ctx

  useEffect(() => {
    registrar(id, listo)
  }, [id, listo, registrar])

  // Se da de baja al desmontar (navegación fuera de /dashboard, o banners
  // como el de instalar app que solo viven en una ruta exacta) -- si no,
  // seguiría "ocupando" su lugar en la cola para siempre aunque ya no esté
  // en pantalla, bloqueando a los de menor prioridad.
  useEffect(() => {
    return () => registrar(id, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return activo === id
}

// Transición compartida de entrada/salida para el banner que gana o pierde
// su turno -- evita el salto brusco de layout de un return null seco:
// mantiene el contenido anterior montado ~200ms más mientras se desvanece
// (opacity + max-height) en vez de desaparecer de golpe. Cada banner se
// envuelve en su propia instancia; como a lo más uno tiene contenido no-nulo
// a la vez, solo una se anima en un momento dado.
export function TransicionBanner({ children }: { children: React.ReactNode }) {
  const [mostrado, setMostrado] = useState<React.ReactNode>(null)
  const [saliendo, setSaliendo] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (children) {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
      setSaliendo(false)
      setMostrado(children)
    } else if (mostrado) {
      setSaliendo(true)
      timeoutRef.current = setTimeout(() => setMostrado(null), 220)
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children])

  if (!mostrado) return null

  return (
    <div
      style={{
        overflow: 'hidden',
        // 600px es una cota amplia a propósito, no la altura real -- estos
        // banners van de una barra angosta (BannerDashboard) hasta la tarjeta
        // de COFEPRIS apilada en columna en móvil. Sub-estimarla recorta
        // contenido real; sobre-estimarla no se nota (la transición sigue
        // siendo del alto real al cerrar, CSS anima hacia el valor final).
        maxHeight: saliendo ? 0 : 600,
        opacity: saliendo ? 0 : 1,
        transition: 'max-height 220ms ease, opacity 180ms ease',
      }}
    >
      {mostrado}
    </div>
  )
}
