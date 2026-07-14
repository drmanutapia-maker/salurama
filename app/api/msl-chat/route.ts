import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

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
  '349':  20,
  '799':  50,
  '1999': 200,
}
const DEFAULT_MESSAGE_LIMIT = MESSAGE_LIMIT_BY_TIER.gratis

const UPGRADE_REQUIRED_MESSAGE =
  'MSL Virtual no está incluido en tu plan actual. Actualiza a Profesional ($349/mes) o superior para acceder a esta herramienta.'

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
Si el contexto no contiene información suficiente para responder con precisión, dilo explícitamente — no inventes ni extrapoles.
Cita la fuente de cada afirmación clínica relevante usando el formato (Autor, Journal, Año).
Usa lenguaje técnico apropiado para hematólogos y oncólogos.
Si el contexto menciona otras publicaciones o estudios como referencia histórica dentro de su propio texto, NO los cites como si fueran fuentes verificadas de tu respuesta. Solo puedes atribuir información directamente a los documentos que aparecen en el CONTEXTO proporcionado a continuación, usando exactamente el autor/journal/año que se te indica para cada bloque. Si el contexto cita internamente otro trabajo (por ejemplo, "según Rajkumar et al. 2014"), puedes mencionar que esa es la fuente original histórica del criterio, pero deja claro que tu respuesta se basa en el documento que sí tienes disponible (por ejemplo: "estos criterios, originalmente publicados por el IMWG en 2014, están recogidos en las guías NCCN 2026 que forman parte de este contexto").
Si el contexto disponible no cubre completamente la pregunta, menciona esa limitación UNA SOLA VEZ, de forma clara y en el lugar más natural de la respuesta (al inicio si aplica a toda la respuesta, o junto al punto específico si aplica solo a una parte). No repitas la misma limitación en una sección de "Conclusión" o cierre separado.`

const NO_CONTEXT_RESPONSE =
  'No encontré información suficiente en el corpus disponible para responder esta pregunta con precisión. ' +
  'Consulta las guías clínicas actualizadas o literatura especializada directamente.'

const JSON_HEADERS = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' }

function err(message: string, status: number, extra?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers: { ...JSON_HEADERS, ...extra } })
}

async function noContextResponse(db: ReturnType<typeof getServiceSupabase>, convId: string) {
  await db.from('msl_messages').insert(
    { conversation_id: convId, role: 'assistant', content: NO_CONTEXT_RESPONSE, sources: [] }
  )
  return NextResponse.json(
    { conversationId: convId, response: NO_CONTEXT_RESPONSE, sources: [] },
    { status: 200, headers: JSON_HEADERS }
  )
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
    }
  }

  let embedding: number[]
  try {
    const res = await getOpenAI().embeddings.create({ model: EMBEDDING_MODEL, input: searchQuery })
    embedding = res.data[0].embedding
  } catch (e: unknown) {
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

  // 5. Búsqueda semántica
  const { data: rawChunks, error: rpcErr } = await db.rpc('match_msl_chunks', {
    query_embedding: embedding,
    match_threshold: MATCH_THRESHOLD,
    match_count:     MATCH_COUNT,
  })

  if (rpcErr) {
    console.error(`[msl-chat:${requestId}] RPC error:`, rpcErr)
    return err('Error en búsqueda semántica', 500)
  }

  const chunks = (rawChunks ?? []) as ChunkMatch[]

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

  // 9. Llamada a Claude
  let assistantContent: string
  try {
    const res = await getAnthropic().messages.create({
      model:      CLAUDE_MODEL,
      max_tokens: 2048,
      system:     systemWithContext,
      messages:   [...priorMessages, { role: 'user', content: message }],
    })
    const textBlock = res.content.find(b => b.type === 'text')
    if (!textBlock) {
      console.error(`[msl-chat:${requestId}] Respuesta de Claude sin bloque de texto:`, res.content)
      return err('Error al generar respuesta. Intenta de nuevo.', 502)
    }
    assistantContent = textBlock.text

    if (res.stop_reason === 'max_tokens') {
      assistantContent += '\n\n---\n*Esta respuesta fue truncada por longitud. Formula una pregunta más específica para obtener el detalle completo.*'
    }
  } catch (e: unknown) {
    const status = (e as { status?: number }).status
    console.error(`[msl-chat:${requestId}] Anthropic error (status=${status}):`, e)
    if (status === 429) {
      return err(
        'Servicio de IA temporalmente no disponible. Intenta en unos minutos.',
        503, { 'Retry-After': '60' }
      )
    }
    if (status === 400) {
      return err(
        'Servicio de IA no disponible: créditos insuficientes en la cuenta Anthropic.',
        503
      )
    }
    return err('Error al generar respuesta. Intenta de nuevo.', 502)
  }

  // 10. Guardar respuesta del asistente (non-fatal si falla)
  const sources: Source[] = uniqueDocIds
    .map(id => docMap.get(id))
    .filter((d): d is DocMeta => d !== undefined)
    .map(({ title, authors, journal, year, doi, verified, sponsor }) => ({ title, authors, journal, year, doi, verified, sponsor }))

  const { error: assistantMsgErr } = await db.from('msl_messages').insert(
    { conversation_id: convId, role: 'assistant', content: assistantContent, sources }
  )

  if (assistantMsgErr) {
    console.error(`[msl-chat:${requestId}] Error guardando respuesta del asistente:`, assistantMsgErr)
  }

  return NextResponse.json(
    { conversationId: convId, response: assistantContent, sources },
    { status: 200, headers: JSON_HEADERS }
  )
}
