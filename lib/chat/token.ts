import { randomBytes, createHash } from 'crypto'
import { SupabaseClient } from '@supabase/supabase-js'

export function generarToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Emite el token de acceso de una sala si todavía no tiene uno (token_hash NULL).
 * El UPDATE condicionado a `token_hash IS NULL` es atómico: si dos llamadas
 * concurrentes compiten por la misma sala, solo una persiste su hash y la otra
 * recibe null, sin necesidad de un SELECT previo.
 */
export async function emitirTokenSiFalta(
  supabase: SupabaseClient,
  salaId: string
): Promise<string | null> {
  const token = generarToken()
  const hash = hashToken(token)

  const { data, error } = await supabase
    .from('chat_salas')
    .update({ token_hash: hash })
    .eq('id', salaId)
    .is('token_hash', null)
    .select('id')

  if (error || !data || data.length === 0) return null
  return token
}

export interface SesionChatVerificada {
  salaId: string
  medicoId: string
  pacienteId: string
  citaActualId: string
  puedeEscribir: boolean
}

export async function verificarToken(
  supabase: SupabaseClient,
  token: unknown
): Promise<SesionChatVerificada | null> {
  if (!token || typeof token !== 'string') return null

  const hash = hashToken(token)

  const { data: sala, error } = await supabase
    .from('chat_salas')
    .select('id, medico_id, paciente_id, cita_actual_id')
    .eq('token_hash', hash)
    .maybeSingle()

  if (error || !sala) return null

  const { data: cerrada, error: cerradaError } = await supabase
    .rpc('sesion_cerrada', { p_cita_id: sala.cita_actual_id })

  if (cerradaError) return null

  return {
    salaId: sala.id,
    medicoId: sala.medico_id,
    pacienteId: sala.paciente_id,
    citaActualId: sala.cita_actual_id,
    puedeEscribir: !cerrada,
  }
}

export interface SalaMedicoVerificada {
  salaId: string
  medicoId: string
  pacienteId: string
  citaActualId: string
  puedeEscribir: boolean
}

/**
 * Igual que verificarToken(), pero para el lado médico: confirma que salaId
 * pertenece a un doctor cuyo user_id es el de la sesión autenticada (userId),
 * en vez de verificar un token de paciente.
 */
export async function verificarSalaMedico(
  supabase: SupabaseClient,
  userId: string,
  salaId: unknown
): Promise<SalaMedicoVerificada | null> {
  if (!salaId || typeof salaId !== 'string') return null

  const { data: sala, error } = await supabase
    .from('chat_salas')
    .select('id, medico_id, paciente_id, cita_actual_id')
    .eq('id', salaId)
    .maybeSingle()

  if (error || !sala) return null

  const { data: doctor } = await supabase
    .from('doctors')
    .select('id')
    .eq('id', sala.medico_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!doctor) return null

  const { data: cerrada, error: cerradaError } = await supabase
    .rpc('sesion_cerrada', { p_cita_id: sala.cita_actual_id })

  if (cerradaError) return null

  return {
    salaId: sala.id,
    medicoId: sala.medico_id,
    pacienteId: sala.paciente_id,
    citaActualId: sala.cita_actual_id,
    puedeEscribir: !cerrada,
  }
}
