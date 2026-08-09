import postgres from 'npm:postgres@3'

// Mismo modelo y reglas que lib/moderacion.ts (evaluarContenido) del lado
// Next.js — reimplementado aquí porque una Edge Function Deno no puede
// importar código de la app Next.js directamente. Si las reglas cambian en
// un lado, hay que actualizar el otro a mano.
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

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

type Veredicto = { status: 'aprobado' | 'señalado'; reason: string }

async function evaluarContenido(anthropicApiKey: string, texto: string): Promise<Veredicto | null> {
  const prompt = `${REGLAS}

TEXTO A EVALUAR:
"""
${texto}
"""

Evalúa si el texto anterior viola alguna de las reglas de contenido prohibido. Responde ÚNICAMENTE en este formato JSON, sin texto adicional:
{"veredicto": "aprobado"|"señalado", "motivo": "..."}

Si el veredicto es "aprobado", "motivo" debe ser una cadena vacía "". Si es "señalado", "motivo" debe ser una explicación breve (una oración) de qué regla viola.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      console.error('moderacion-pendiente: Anthropic HTTP', res.status, await res.text())
      return null
    }
    const data = await res.json()
    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === 'text')
    if (!textBlock) return null

    const raw = String(textBlock.text).trim()
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(jsonText) as { veredicto?: unknown; motivo?: unknown }

    if (parsed.veredicto !== 'aprobado' && parsed.veredicto !== 'señalado') return null
    if (typeof parsed.motivo !== 'string') return null

    return { status: parsed.veredicto, reason: parsed.motivo }
  } catch (err) {
    console.error('moderacion-pendiente: error evaluando contenido:', err)
    return null
  }
}

Deno.serve(async (req) => {
  const cronHeader = req.headers.get('X-Cron-Secret')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronHeader || !cronSecret || cronHeader !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const dbUrl = Deno.env.get('DB_POOLER_URL')
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!dbUrl || !anthropicApiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'missing_env', dbUrl: !!dbUrl, anthropicApiKey: !!anthropicApiKey }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  let sql: ReturnType<typeof postgres>
  try {
    sql = postgres(dbUrl, { max: 1, prepare: false })
  } catch (err) {
    console.error('moderacion-pendiente: error creando conexión:', err)
    return new Response(
      JSON.stringify({ ok: false, error: 'db_connect_failed', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  try {
    // Umbral de 15 min para no competir con moderaciones que apenas están en
    // curso (la llamada normal, disparada al crear, típicamente tarda
    // segundos) — esto es solo la red de seguridad para cuando esa llamada
    // nunca llegó a correr (ej. el médico cerró la pestaña de inmediato).
    // reviews: solo si tiene comment — sin texto no hay nada que evaluar, y
    // así se quedan a propósito en pendiente_revision_ia para siempre.
    const reviewsPendientes = await sql`
      SELECT id, comment FROM reviews
      WHERE moderation_status = 'pendiente_revision_ia'
        AND comment IS NOT NULL
        AND created_at <= now() - interval '15 minutes'
    `
    const respuestasPendientes = await sql`
      SELECT id, respuesta FROM review_responses
      WHERE moderation_status = 'pendiente_revision_ia'
        AND created_at <= now() - interval '15 minutes'
    `

    let evaluadas = 0
    let fallidas = 0

    for (const row of reviewsPendientes) {
      const veredicto = await evaluarContenido(anthropicApiKey, row.comment)
      if (!veredicto) { fallidas++; continue }
      await sql`
        UPDATE reviews SET
          moderation_status = ${veredicto.status},
          moderation_reason = ${veredicto.reason || null},
          moderation_flagged_by = ${veredicto.status === 'señalado' ? 'ia' : null},
          moderation_reviewed_at = now()
        WHERE id = ${row.id}
      `
      evaluadas++
    }

    for (const row of respuestasPendientes) {
      const veredicto = await evaluarContenido(anthropicApiKey, row.respuesta)
      if (!veredicto) { fallidas++; continue }
      await sql`
        UPDATE review_responses SET
          moderation_status = ${veredicto.status},
          moderation_reason = ${veredicto.reason || null},
          moderation_flagged_by = ${veredicto.status === 'señalado' ? 'ia' : null},
          moderation_reviewed_at = now()
        WHERE id = ${row.id}
      `
      evaluadas++
    }

    return new Response(
      JSON.stringify({
        ok: true,
        candidatos: reviewsPendientes.length + respuestasPendientes.length,
        evaluadas,
        fallidas,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('moderacion-pendiente: error fatal:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    await sql.end()
  }
})
