import { supabase } from '@/lib/supabaseClient'

type MensajeMin = { sala_id: string; remitente_tipo: string; created_at: string }
type SalaMin = { id: string; created_at: string; medico_leido_at: string | null }

// Heurística de "no leído": mensajes del paciente posteriores al umbral de
// esa sala, donde el umbral es el más reciente entre (a) el último mensaje
// del médico, y (b) chat_salas.medico_leido_at — que se actualiza cada vez
// que el médico abre la conversación (app/api/chat/medico/sesion/route.ts),
// para que el badge se limpie aunque el médico solo lea sin responder.
// Sin ninguno de los dos, cae a la fecha de creación de la sala.
// Fuente original: components/chat/ConversacionesLista.tsx
export function sinLeerPorSala(salas: SalaMin[], mensajes: MensajeMin[]): Map<string, number> {
  const ultimoMedicoPorSala = new Map<string, string>()
  const mensajesPorSala = new Map<string, MensajeMin[]>()

  for (const m of mensajes) {
    if (m.remitente_tipo === 'medico') ultimoMedicoPorSala.set(m.sala_id, m.created_at)
    const arr = mensajesPorSala.get(m.sala_id) || []
    arr.push(m)
    mensajesPorSala.set(m.sala_id, arr)
  }

  const resultado = new Map<string, number>()
  for (const s of salas) {
    const candidatos = [s.created_at, ultimoMedicoPorSala.get(s.id), s.medico_leido_at].filter(Boolean) as string[]
    const umbral = candidatos.reduce((a, b) => (a > b ? a : b))
    const mensajesSala = mensajesPorSala.get(s.id) || []
    resultado.set(s.id, mensajesSala.filter(m => m.remitente_tipo === 'paciente' && m.created_at > umbral).length)
  }
  return resultado
}

export async function contarMensajesSinLeerTotal(medicoId: string): Promise<number> {
  const { data: salas } = await supabase
    .from('chat_salas')
    .select('id, created_at, medico_leido_at')
    .eq('medico_id', medicoId)

  if (!salas || salas.length === 0) return 0

  const salaIds = salas.map(s => s.id)
  const { data: mensajes } = await supabase
    .from('chat_mensajes')
    .select('sala_id, remitente_tipo, created_at')
    .in('sala_id', salaIds)

  const mapa = sinLeerPorSala(salas as SalaMin[], (mensajes || []) as MensajeMin[])
  let total = 0
  mapa.forEach(v => { total += v })
  return total
}
