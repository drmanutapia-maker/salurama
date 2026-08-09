import { SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// Mismo modelo y patrón (prompt JSON-only, parseo tolerante a code fences)
// que rewriteAndClassifyQuery en app/api/msl-chat/route.ts.
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

// Reglas tomadas literal de app/documentos-adicionales/politica-de-resenas —
// la IA evalúa contra el mismo texto legal que ya es público, no una versión
// distinta inventada aparte.
const REGLAS = `Las reseñas y respuestas en esta plataforma médica deben ser:
- Honestas y basadas en experiencia personal real.
- Respetuosas y sin lenguaje ofensivo o discriminatorio.
- Relacionadas con el servicio recibido (trato, puntualidad, instalaciones, comunicación).

Contenido prohibido:
- Información médica confidencial propia o de terceros.
- Datos personales de terceros sin consentimiento (nombres completos, teléfonos, direcciones de otras personas).
- Contenido difamatorio, falso o con ánimo de daño.
- Publicidad o promoción de servicios de terceros.
- Amenazas de cualquier tipo.`

export interface VeredictoModeracion {
  status: 'aprobado' | 'señalado'
  reason: string
}

// Nunca lanza — si Haiku falla o responde en un formato inesperado, devuelve
// null y el caller deja moderation_status en 'pendiente_revision_ia' (nunca
// asume "aprobado" para contenido que en realidad no se evaluó).
export async function evaluarContenido(texto: string): Promise<VeredictoModeracion | null> {
  const prompt = `${REGLAS}

TEXTO A EVALUAR:
"""
${texto}
"""

Evalúa si el texto anterior viola alguna de las reglas de contenido prohibido. Responde ÚNICAMENTE en este formato JSON, sin texto adicional:
{"veredicto": "aprobado"|"señalado", "motivo": "..."}

Si el veredicto es "aprobado", "motivo" debe ser una cadena vacía "". Si es "señalado", "motivo" debe ser una explicación breve (una oración) de qué regla viola.`

  try {
    const res = await getAnthropic().messages.create({
      model: HAIKU_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = res.content.find(b => b.type === 'text')
    if (!textBlock) return null

    const raw = textBlock.text.trim()
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(jsonText) as { veredicto?: unknown; motivo?: unknown }

    if (parsed.veredicto !== 'aprobado' && parsed.veredicto !== 'señalado') return null
    if (typeof parsed.motivo !== 'string') return null

    return { status: parsed.veredicto, reason: parsed.motivo }
  } catch (e) {
    console.error('[moderacion] Error evaluando contenido con Haiku:', e)
    return null
  }
}

// Evalúa una reseña o respuesta ya insertada y escribe el veredicto. Usa
// service role (bypassa RLS) — pensado para llamarse desde rutas de API con
// el cliente de service role ya creado.
export async function moderarContenido(
  db: SupabaseClient,
  tipo: 'review' | 'review_response',
  id: string,
  texto: string
): Promise<void> {
  const veredicto = await evaluarContenido(texto)
  if (!veredicto) return // se queda en pendiente_revision_ia

  const tabla = tipo === 'review' ? 'reviews' : 'review_responses'
  const { error } = await db
    .from(tabla)
    .update({
      moderation_status: veredicto.status,
      moderation_reason: veredicto.reason || null,
      moderation_flagged_by: veredicto.status === 'señalado' ? 'ia' : null,
      moderation_reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error(`[moderacion] Error guardando veredicto para ${tipo} ${id}:`, error)
  }
}
