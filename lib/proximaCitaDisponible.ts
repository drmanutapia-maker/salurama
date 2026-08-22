// "Próxima cita disponible" para tarjetas de listado (ej. /buscar) --
// aproximación a nivel DÍA, no valida hora por hora contra `citas` ya
// reservadas: eso requeriría consultar las citas de cada médico, demasiado
// costoso para una lista de hasta 100 médicos a la vez. Devuelve el primer
// día, dentro de la ventana, en que el médico normalmente atiende (según su
// horario semanal) y que no bloqueó explícitamente (doctor_blocked_dates),
// junto con la hora de INICIO de su horario ese día -- no necesariamente el
// primer hueco real libre, que sí se valida con precisión al reservar en el
// perfil del médico (app/doctor/[slug]/DoctorProfileClient.tsx).
//
// Mismo criterio de "¿el médico atiende este día?" que ya usa esa pantalla
// de reserva (horarioParsed + diaEstaAbierto), reescrito aquí como función
// pura reutilizable en vez de vivir embebido dentro de ese componente.

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

function normalizarHorario(horarioRaw: unknown): Record<string, any> | null {
  if (!horarioRaw) return null
  let horario: any = horarioRaw
  if (typeof horario === 'string') {
    try { horario = JSON.parse(horario) } catch { return null }
  }
  if (typeof horario !== 'object') return null

  const normalizado: Record<string, any> = {}
  for (const key of Object.keys(horario)) {
    const keyNormalizada = key.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    normalizado[keyNormalizada] = horario[key]
  }
  return normalizado
}

function horaInicioSiAbierto(horarioParsed: Record<string, any> | null, dayIndex: number): string | null {
  if (!horarioParsed) return null
  const horarioDia = horarioParsed[DIAS_SEMANA[dayIndex]]
  if (!horarioDia) return null
  const inicio = horarioDia.inicio || horarioDia.start
  const fin = horarioDia.fin || horarioDia.end
  const abierto = horarioDia.abierto ?? horarioDia.open ?? horarioDia.activo ?? !!(inicio && fin)
  return (abierto && inicio && fin) ? inicio : null
}

export interface ProximoDiaDisponible {
  fecha: string // YYYY-MM-DD
  horaInicio: string // "HH:MM" del horario de ese día, no un hueco verificado
}

// Empieza en "mañana" (no "hoy") a propósito -- a este nivel de
// aproximación no se compara contra la hora actual, así que ofrecer "hoy"
// podría mostrar una hora de inicio que ya pasó.
export function proximoDiaDisponible(
  horarioRaw: unknown,
  fechasBloqueadas: Set<string>,
  hoy: Date = new Date(),
  diasAdelante = 45
): ProximoDiaDisponible | null {
  const horarioParsed = normalizarHorario(horarioRaw)
  if (!horarioParsed) return null

  for (let i = 1; i <= diasAdelante; i++) {
    const candidato = new Date(hoy)
    candidato.setDate(candidato.getDate() + i)
    const candidatoISO = candidato.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    if (fechasBloqueadas.has(candidatoISO)) continue

    const horaInicio = horaInicioSiAbierto(horarioParsed, candidato.getDay())
    if (horaInicio) return { fecha: candidatoISO, horaInicio }
  }
  return null
}
