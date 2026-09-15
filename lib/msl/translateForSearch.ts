import Anthropic from '@anthropic-ai/sdk'

// Compartido entre app/api/msl-chat/route.ts y scripts/calibrate-search-threshold.ts
// — la calibración del piso de similitud solo es válida si mide contra la
// MISMA normalización que corre en producción. Si esto se duplicara en los
// dos archivos, un cambio al prompt en uno solo desalinearía la calibración
// sin que nadie lo notara.
//
// Normalización de la consulta para búsqueda semántica — el corpus (papers
// científicos) está en inglés, pero los médicos preguntan en su idioma, y con
// frecuencia usan la sigla local de la enfermedad (ej. "LLA") en vez del
// término expandido. Esa sigla no comparte texto con su equivalente en inglés
// ("ALL"), así que el embedding cruza mucho peor de lo que ya cruza el
// español-inglés por sí solo — se midió una similitud de 0.39 (ni entra al
// top 30) contra 0.63 una vez traducida la sigla, para la misma pregunta real
// (esquema de primera línea para LLA). No depende de ninguna especialidad ni
// lista de siglas fija — el modelo generaliza a cualquier término médico de
// cualquier especialidad futura. Si falla, se usa la consulta original sin
// traducir — no debe convertirse en un punto único de fallo del chat.
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001' // verificado contra anthropic.models.list(), no asumido

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

export async function translateForSearch(query: string, requestId = 'sin-request-id'): Promise<string> {
  const prompt = `Traduce la siguiente pregunta médica al inglés, usando terminología y siglas médicas estándar tal como aparecen en la literatura científica en inglés (por ejemplo, convierte siglas o abreviaturas locales a su equivalente en inglés cuando exista uno de uso establecido en la literatura — p.ej. "LLA" → "ALL", "IAM" → "MI"). Responde ÚNICAMENTE con la traducción, sin comentarios ni texto adicional. Si la pregunta ya está en inglés, respóndela tal cual.

PREGUNTA: ${query}`

  try {
    const res = await getAnthropic().messages.create({
      model:      HAIKU_MODEL,
      max_tokens: 200,
      messages:   [{ role: 'user', content: prompt }],
    })
    const textBlock = res.content.find(b => b.type === 'text')
    if (!textBlock || !textBlock.text.trim()) return query
    return textBlock.text.trim()
  } catch (e) {
    console.error(`[msl:${requestId}] Error traduciendo consulta para búsqueda:`, e)
    return query
  }
}
