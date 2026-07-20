import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { PLAN_TO_TIER_CODE, PLAN_NAME, PLAN_MONTHLY_PRICE_MXN } from '@/lib/pricingTiers'

export const dynamic = 'force-dynamic'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const CLAUDE_MODEL    = 'claude-sonnet-4-6'
const HAIKU_MODEL     = 'claude-haiku-4-5-20251001' // verificado contra anthropic.models.list(), no asumido
const MATCH_THRESHOLD    = 0.5
const MATCH_COUNT        = 15
const MAX_CHUNKS_PER_DOC = 2
const FINAL_CHUNK_COUNT  = 5

// Límites por nivel de pricing (doctors.pricing_tier), confirmados 2026-07-11.
// Gratis = 0: MSL Virtual no está incluido en ese nivel (no es un rate limit,
// es exclusión de la herramienta — ver manejo especial más abajo).
const MESSAGE_LIMIT_BY_TIER: Record<string, number> = {
  gratis: 0,
  [PLAN_TO_TIER_CODE.profesional]: 20,
  [PLAN_TO_TIER_CODE.premium]:     50,
  [PLAN_TO_TIER_CODE.clinica]:     200,
}
const DEFAULT_MESSAGE_LIMIT = MESSAGE_LIMIT_BY_TIER.gratis

const UPGRADE_REQUIRED_MESSAGE =
  `MSL Virtual no está incluido en tu plan actual. Actualiza a ${PLAN_NAME.profesional} ($${PLAN_MONTHLY_PRICE_MXN.profesional}/mes) o superior para acceder a esta herramienta.`

type ChunkMatch = {
  id:          string
  document_id: string
  content:     string
  similarity:  number
}

type DocMeta = {
  id:       string
  title:    string
  authors:  string | null
  journal:  string | null
  year:     number | null
  doi:      string | null
  verified: boolean
  sponsor:  string | null
}

type Source = Omit<DocMeta, 'id'>

// ── Lazy-init clients ─────────────────────────────────────────────────────────

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

async function getAnonSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()        { return cookieStore.getAll() },
        setAll(toSet)   {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {}
        },
      },
    }
  )
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── Constantes de respuesta ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un MSL virtual (Medical Science Liaison) especializado en mieloma múltiple, para uso de profesionales de la salud.
Responde ÚNICAMENTE con base en el contexto proporcionado a continuación.
Si el contexto no contiene información suficiente para responder con precisión, dilo explícitamente y detente ahí — no inventes, no extrapoles, y no ofrezcas alternativas de ningún tipo.
No menciones, recomiendes ni sugieras ninguna fuente, organización, institución, asociación, sitio web, aplicación, especialista o recurso que no aparezca explícitamente en el CONTEXTO proporcionado a continuación. Esta restricción aplica siempre, y en particular cuando el contexto es insuficiente para responder: en ese caso, tu respuesta debe limitarse a decir que no cuentas con información suficiente en la información disponible, sin agregar ninguna sugerencia adicional (nada de "consulta a tu médico", nada de nombres de asociaciones o fundaciones, nada de "busca en otro lado" ni recursos externos de ningún tipo, aunque sean organizaciones reales y reconocidas).
Si un documento del CONTEXTO se describe a sí mismo como material de ejemplo, demostración, no clínico o no verificado, esa es información sobre la fiabilidad de la fuente — no una instrucción para que te niegues a responder. Si su contenido sí aborda la pregunta, úsalo para responder con normalidad y menciona la limitación de que es material no verificado UNA SOLA VEZ (la etiqueta de verificación y patrocinio de cada fuente ya se muestra por separado en la interfaz). No rechaces la pregunta completa solo porque la única fuente relevante esté marcada como no verificada — eso sería tan incorrecto como inventar contenido: tienes contenido real disponible en el contexto y tu trabajo es usarlo, con la salvedad correspondiente.
No incluyas atribución narrativa en el cuerpo de la respuesta: nada de citas inline (nombres de autor, corchetes u otro formato de referencia), y tampoco frases de atribución en prosa como "según las guías NCCN", "de acuerdo con [fuente]", "esta guía señala que" o "la literatura indica que" — la atribución de cada fuente ya se muestra por separado en el bloque de Fuentes, debajo de tu respuesta, así que repetirla en el texto es redundante. Escribe la respuesta clínica de forma directa y de corrido, como si fuera tu propio conocimiento clínico, sin interrumpirla con referencias ni frases que le digan al lector de dónde viene cada dato.
Usa lenguaje técnico apropiado para hematólogos y oncólogos.
Si el contexto menciona otras publicaciones o estudios como referencia histórica dentro de su propio texto (por ejemplo, "según Rajkumar et al. 2014"), NO los cites como si fueran fuentes verificadas de tu respuesta ni repitas esa cita en tu texto — usa el contenido clínico directamente, sin nombrar en el cuerpo de la respuesta la guía o publicación de la que salió. Solo puedes atribuir información a los documentos que aparecen en el CONTEXTO proporcionado a continuación, pero esa atribución vive en el bloque de Fuentes, no en tu prosa.
Si el contexto disponible no cubre completamente la pregunta, menciona esa limitación UNA SOLA VEZ, de forma clara y en el lugar más natural de la respuesta (al inicio si aplica a toda la respuesta, o junto al punto específico si aplica solo a una parte). No repitas la misma limitación en una sección de "Conclusión" o cierre separado.
Si el contexto no contiene información suficiente para responder con precisión la pregunta específica, pero sí incluye contenido relacionado con el tema general (el mismo contenido que el médico verá listado en el bloque de Fuentes debajo de tu respuesta), acláralo explícitamente para que no parezca una contradicción entre tu texto y esa lista — por ejemplo: "No tengo información suficiente para responder con precisión a [la pregunta específica], aunque las fuentes disponibles abajo abordan temas relacionados que podrían orientarte." No agregues esta aclaración cuando sí respondiste la pregunta con precisión — aplica únicamente al caso de información insuficiente con fuentes parcialmente relacionadas.`

const NO_CONTEXT_RESPONSE =
  'No encontré información suficiente en los documentos disponibles para responder esta pregunta con precisión. ' +
  'Consulta las guías clínicas actualizadas o literatura especializada directamente.'

const JSON_HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' }

function err(message: string, status: number, extra?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers: { ...JSON_HEADERS, ...extra } })
}

// ── Streaming NDJSON ──────────────────────────────────────────────────────────
// Contrato con el cliente: status 200 SIEMPRE es un stream NDJSON (una línea
// JSON por evento: chunk/retry/done/error). Cualquier otro status sigue
// siendo JSON plano de error, como antes. Esto evita tener dos formatos
// distintos de body bajo el mismo status 200.

function ndjsonResponse(run: (send: (event: Record<string, unknown>) => void) => Promise<void>) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }
      try {
        await run(send)
      } catch (e) {
        console.error('[msl-chat] Error inesperado en stream NDJSON:', e)
      } finally {
        controller.close()
      }
    },
  })
  return new NextResponse(stream, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function noContextResponse(db: ReturnType<typeof getServiceSupabase>, convId: string) {
  await db.from('msl_messages').insert(
    { conversation_id: convId, role: 'assistant', content: NO_CONTEXT_RESPONSE, sources: [] }
  )
  return ndjsonResponse(async send => {
    send({ type: 'chunk', text: NO_CONTEXT_RESPONSE })
    send({ type: 'done', conversationId: convId, sources: [] })
  })
}

// ── Llamada a Claude con reintento único e invisible ──────────────────────────
// Si el streaming se corta a medias (error del proveedor o de red), el texto
// parcial recibido se descarta por completo — nunca se persiste ni se envía
// un evento 'done' con él — y se reintenta una vez desde cero. El costo de
// latencia extra del reintento es aceptado (decisión de Manuel) a cambio de
// que el médico nunca vea una respuesta cortada.

type AnthropicStreamOutcome = { text: string; stopReason: string | null }

const MAX_CLAUDE_ATTEMPTS = 2 // intento inicial + 1 reintento, no más
const RETRY_DELAY_MS       = 600

async function callClaudeOnce(
  systemWithContext: string,
  priorMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  message: string,
  onChunk: (snapshot: string) => void
): Promise<AnthropicStreamOutcome> {
  const stream = getAnthropic().messages.stream({
    model:      CLAUDE_MODEL,
    max_tokens: 2048,
    system:     systemWithContext,
    messages:   [...priorMessages, { role: 'user', content: message }],
  })
  stream.on('text', (_delta, snapshot) => onChunk(snapshot))
  const final = await stream.finalMessage()
  const textBlock = final.content.find(b => b.type === 'text')
  if (!textBlock) throw new Error('Respuesta de Claude sin bloque de texto')
  return { text: textBlock.text, stopReason: final.stop_reason }
}

function claudeErrorMessage(e: unknown): string {
  const status = (e as { status?: number }).status
  if (status === 429) return 'Servicio de IA temporalmente no disponible. Intenta en unos minutos.'
  if (status === 400) return 'Servicio de IA no disponible: créditos insuficientes en la cuenta Anthropic.'
  return 'No se pudo generar la respuesta tras varios intentos. Revisa tu conexión e inténtalo de nuevo.'
}

// ── Reescritura + clasificación de dominio ────────────────────────────────────
// Solo se invoca cuando hay historial: sin historial no hay ambigüedad que
// resolver. Combina reescritura de la pregunta elíptica y clasificación de
// dominio en una sola llamada a Haiku para no pagar dos veces. Si falla,
// el caller hace fallback al embedding enriquecido simple — este paso es una
// mejora, no debe convertirse en un punto único de fallo del chat.

type RewriteResult = { rewrittenQuery: string; sameDomain: boolean }

async function rewriteAndClassifyQuery(
  priorMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  message: string,
  requestId: string
): Promise<RewriteResult | null> {
  const historialTexto = priorMessages
    .slice(-3)
    .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
    .join('\n')

  const prompt = `Dado el siguiente historial de conversación y la pregunta nueva del usuario, haz dos cosas:
1. Si la pregunta nueva depende del contexto previo para tener sentido (usa pronombres, es elíptica, o es un seguimiento directo del mismo tema), reescríbela como una pregunta autónoma y completa que incluya el contexto necesario.
2. Indica si la pregunta nueva (ya reescrita o no) sigue siendo sobre el mismo dominio temático general que la conversación previa, o si es un cambio de tema hacia algo no relacionado.

Responde ÚNICAMENTE en este formato JSON, sin texto adicional:
{"rewritten_query": "...", "same_domain": true|false}

HISTORIAL:
${historialTexto}

PREGUNTA NUEVA: ${message}`

  try {
    const res = await getAnthropic().messages.create({
      model:      HAIKU_MODEL,
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    })

    const textBlock = res.content.find(b => b.type === 'text')
    if (!textBlock) return null

    const raw      = textBlock.text.trim()
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed   = JSON.parse(jsonText) as { rewritten_query?: unknown; same_domain?: unknown }

    if (typeof parsed.rewritten_query !== 'string' || typeof parsed.same_domain !== 'boolean') {
      return null
    }
    return { rewrittenQuery: parsed.rewritten_query, sameDomain: parsed.same_domain }
  } catch (e) {
    console.error(`[msl-chat:${requestId}] Error en reescritura/clasificación de consulta:`, e)
    return null
  }
}

function diversifyChunks(chunks: ChunkMatch[]): ChunkMatch[] {
  const perDocCount = new Map<string, number>()
  const result: ChunkMatch[] = []
  for (const chunk of chunks) {
    const count = perDocCount.get(chunk.document_id) ?? 0
    if (count < MAX_CHUNKS_PER_DOC) {
      result.push(chunk)
      perDocCount.set(chunk.document_id, count + 1)
    }
    if (result.length >= FINAL_CHUNK_COUNT) break
  }
  return result
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  // 1. Parse body
  let body: { message?: unknown; conversationId?: unknown }
  try {
    body = await request.json()
  } catch {
    return err('JSON inválido', 400)
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return err('El campo message es requerido y no puede estar vacío', 400)
  }

  const incomingConvId = typeof body.conversationId === 'string' ? body.conversationId : null

  // 2. Autenticación — mismo patrón que las Server Actions de HEMA
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()

  if (authError || !user) {
    return err('No autorizado', 401)
  }

  const db = getServiceSupabase()

  // 2b. Límite diario de preguntas por médico, según su nivel de pricing
  const { data: doctorRow } = await db
    .from('doctors')
    .select('pricing_tier')
    .eq('user_id', user.id)
    .maybeSingle()

  const dailyLimit = MESSAGE_LIMIT_BY_TIER[doctorRow?.pricing_tier ?? 'gratis'] ?? DEFAULT_MESSAGE_LIMIT

  // Nivel Gratis: MSL Virtual no es un rate limit, es una herramienta no incluida
  // en el plan — 403 (no autorizado a este recurso), no 429 (límite de uso).
  if (dailyLimit === 0) {
    return err(UPGRADE_REQUIRED_MESSAGE, 403)
  }

  const { data: msgCountToday, error: countErr } = await db.rpc('count_msl_user_messages_today', {
    p_user_id: user.id,
  })

  if (countErr) {
    console.error(`[msl-chat:${requestId}] Error contando mensajes del día:`, countErr)
  } else if ((msgCountToday ?? 0) >= dailyLimit) {
    return err(
      `Alcanzaste el límite de ${dailyLimit} preguntas por día. El límite se reinicia a medianoche.`,
      429
    )
  }

  // 3. Conversación — crear o verificar que pertenece al usuario
  let convId: string

  if (incomingConvId) {
    const { data: existing } = await db
      .from('msl_conversations')
      .select('id')
      .eq('id', incomingConvId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existing) {
      return err('Conversación no encontrada', 404)
    }
    convId = incomingConvId
  } else {
    const { data: conv, error: convErr } = await db
      .from('msl_conversations')
      .insert({ user_id: user.id, specialty: 'hematologia', pathology: 'mieloma_multiple' })
      .select('id')
      .single()

    if (convErr || !conv) {
      console.error(`[msl-chat:${requestId}] Error creando conversación:`, convErr)
      return err('Error al iniciar conversación', 500)
    }
    convId = conv.id
  }

  // 3b. Historial previo — se recupera ANTES de guardar el mensaje actual para evitar duplicado
  let priorMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  if (incomingConvId) {
    const { data: history } = await db
      .from('msl_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(20)

    priorMessages = (history ?? []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
  }

  // 3c. Guardar mensaje del usuario inmediatamente — queda registrado aunque falle el resto
  const { error: userMsgErr } = await db
    .from('msl_messages')
    .insert({ conversation_id: convId, role: 'user', content: message, sources: null })

  if (userMsgErr) {
    console.error(`[msl-chat:${requestId}] Error guardando mensaje del usuario (3c):`, userMsgErr)
  }

  // 4. Reescritura + clasificación de dominio (solo con historial) y embedding del mensaje
  let searchQuery = message
  let needsDualQuery = false

  if (priorMessages.length > 0) {
    const rewrite = await rewriteAndClassifyQuery(priorMessages, message, requestId)

    if (rewrite === null) {
      // Fallback: comportamiento previo (embedding enriquecido simple) si la
      // reescritura falla — no debe tumbar el chat completo.
      searchQuery = `${priorMessages.slice(-2).map(m => m.content).join(' ')} ${message}`
    } else if (!rewrite.sameDomain) {
      return noContextResponse(db, convId)
    } else {
      searchQuery = rewrite.rewrittenQuery
      // El rewrite puede arrastrar el tema dominante de la conversación previa
      // hacia una pregunta de seguimiento que ya era autónoma (p.ej. le agrega
      // "mieloma múltiple" a una pregunta que no lo necesitaba) — eso trae
      // chunks reales pero fuera de tema que diluyen el contexto y empujan al
      // modelo a rechazar aunque sí exista una fuente relevante. Se marca para
      // búsqueda dual solo cuando el texto realmente cambió.
      needsDualQuery = searchQuery.trim().toLowerCase() !== message.trim().toLowerCase()
    }
  }

  async function embedAndSearch(query: string): Promise<ChunkMatch[]> {
    let embedding: number[]
    try {
      const res = await getOpenAI().embeddings.create({ model: EMBEDDING_MODEL, input: query })
      embedding = res.data[0].embedding
    } catch (e: unknown) {
      throw Object.assign(e as object, { __mslStage: 'embedding' })
    }
    const { data: raw, error } = await db.rpc('match_msl_chunks', {
      query_embedding: embedding,
      match_threshold: MATCH_THRESHOLD,
      match_count:     MATCH_COUNT,
    })
    if (error) throw Object.assign(new Error('RPC error'), { __mslStage: 'rpc', cause: error })
    return (raw ?? []) as ChunkMatch[]
  }

  // 5. Búsqueda semántica — dual (original + reescrita) cuando el rewrite
  // cambió la pregunta, prefiriendo la intersección de ambos resultados. Si
  // la intersección es vacía, la pregunta original era genuinamente elíptica
  // (necesitaba el contexto previo para tener sentido) y se usa la reescrita
  // completa — el mismo comportamiento que ya existía antes de este fix.
  let chunks: ChunkMatch[]
  try {
    if (needsDualQuery) {
      const [chunksOriginal, chunksRewritten] = await Promise.all([
        embedAndSearch(message),
        embedAndSearch(searchQuery),
      ])
      const originalIds = new Set(chunksOriginal.map(c => c.id))
      const intersection = chunksRewritten.filter(c => originalIds.has(c.id))
      chunks = intersection.length > 0 ? intersection : chunksRewritten
    } else {
      chunks = await embedAndSearch(searchQuery)
    }
  } catch (e: unknown) {
    const stage = (e as { __mslStage?: string }).__mslStage
    if (stage === 'rpc') {
      console.error(`[msl-chat:${requestId}] RPC error:`, (e as { cause?: unknown }).cause)
      return err('Error en búsqueda semántica', 500)
    }
    const status = (e as { status?: number }).status
    console.error(`[msl-chat:${requestId}] OpenAI embedding error:`, e)
    if (status === 429) {
      return err(
        'Servicio de embeddings temporalmente no disponible (cuota excedida). Intenta en unos minutos.',
        503, { 'Retry-After': '60' }
      )
    }
    return err('Error al procesar la pregunta. Intenta de nuevo.', 502)
  }

  // 6. Sin contexto suficiente — respuesta honesta, sin llamar a Claude
  if (chunks.length === 0) {
    return noContextResponse(db, convId)
  }

  const diversifiedChunks = diversifyChunks(chunks)

  // 7. Metadatos de documentos únicos
  const uniqueDocIds = [...new Set(diversifiedChunks.map(c => c.document_id))]

  const { data: rawDocs, error: docsErr } = await db
    .from('msl_documents')
    .select('id, title, authors, journal, year, doi, verified, sponsor')
    .in('id', uniqueDocIds)

  if (docsErr) {
    console.error(`[msl-chat:${requestId}] Error fetching doc metadata:`, docsErr)
    return err('Error recuperando metadatos de documentos', 500)
  }

  const docMap = new Map<string, DocMeta>()
  for (const doc of rawDocs ?? []) docMap.set(doc.id, doc as DocMeta)

  // 8. System prompt con contexto etiquetado
  const contextBlocks = diversifiedChunks
    .map(c => {
      const doc = docMap.get(c.document_id)
      const label = doc
        ? `[${doc.authors ?? 'Autor desconocido'}, ${doc.journal ?? 'Journal desconocido'}, ${doc.year ?? 'Año desconocido'}]`
        : '[Fuente desconocida]'
      return `${label}\n${c.content}`
    })
    .join('\n\n---\n\n')

  const systemWithContext = `${SYSTEM_PROMPT}\n\nCONTEXTO:\n${contextBlocks}`

  // 9-10. Llamada a Claude (streaming, con reintento único e invisible) +
  // guardado del mensaje del asistente. Las fuentes no dependen de la
  // respuesta de Claude, se calculan antes de entrar al stream.
  const sources: Source[] = uniqueDocIds
    .map(id => docMap.get(id))
    .filter((d): d is DocMeta => d !== undefined)
    .map(({ title, authors, journal, year, doi, verified, sponsor }) => ({ title, authors, journal, year, doi, verified, sponsor }))

  return ndjsonResponse(async send => {
    let outcome: AnthropicStreamOutcome | null = null

    for (let attempt = 1; attempt <= MAX_CLAUDE_ATTEMPTS; attempt++) {
      try {
        outcome = await callClaudeOnce(systemWithContext, priorMessages, message, snapshot => {
          send({ type: 'chunk', text: snapshot })
        })
        break
      } catch (e: unknown) {
        console.error(`[msl-chat:${requestId}] Intento ${attempt}/${MAX_CLAUDE_ATTEMPTS} de Claude falló:`, e)
        if (attempt === MAX_CLAUDE_ATTEMPTS) {
          send({ type: 'error', message: claudeErrorMessage(e) })
          return
        }
        // Reintento invisible: el cliente descarta cualquier texto parcial
        // mostrado hasta ahora al recibir este evento, sin decir por qué.
        send({ type: 'retry' })
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }

    if (!outcome) return // inalcanzable dado el control de flujo anterior

    let assistantContent = outcome.text
    if (outcome.stopReason === 'max_tokens') {
      assistantContent += '\n\n---\n*Esta respuesta fue truncada por longitud. Formula una pregunta más específica para obtener el detalle completo.*'
      send({ type: 'chunk', text: assistantContent })
    }

    // Solo la versión completa y correcta llega aquí — un intento fallido
    // nunca se persiste (ver return anticipado arriba tras el último intento).
    const { error: assistantMsgErr } = await db.from('msl_messages').insert(
      { conversation_id: convId, role: 'assistant', content: assistantContent, sources }
    )
    if (assistantMsgErr) {
      console.error(`[msl-chat:${requestId}] Error guardando respuesta del asistente:`, assistantMsgErr)
    }

    send({ type: 'done', conversationId: convId, sources })
  })
}
