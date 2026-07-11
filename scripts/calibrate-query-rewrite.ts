// Script de calibración — uso único, NO se integra a producción.
//
// Objetivo: validar el enfoque de "reescritura + clasificación de dominio en
// una sola llamada a Claude Haiku" antes de integrarlo a app/api/msl-chat/route.ts.
// El enfoque de piso de similitud aislada (scripts/calibrate-search-threshold.ts)
// se descartó porque las preguntas de otra especialidad hematológica (ej. LMA,
// linfoma) puntúan más alto que los seguimientos legítimos — comparten jerga
// clínica con el corpus de mieloma sin ser relevantes.
//
// Corre los mismos 20 TEST_CASES, cada uno como seguimiento de un historial
// sintético de 2 turnos sobre mieloma múltiple, y verifica que Haiku clasifique
// same_domain correctamente para los 11 "debe_pasar" (true) y 9 "debe_fallar" (false).
//
// Uso:
//   npx tsx scripts/calibrate-query-rewrite.ts

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import Anthropic from '@anthropic-ai/sdk'
import { TEST_CASES, type Category } from './calibration-test-cases'

// Verificado contra anthropic.models.list() antes de usar — no asumido.
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) throw new Error('❌ Falta ANTHROPIC_API_KEY en .env.local')

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// Historial sintético representativo de una conversación real en curso sobre
// mieloma múltiple — mismo formato que priorMessages en route.ts.
const HISTORIAL: Array<{ role: 'user' | 'assistant'; content: string }> = [
  {
    role:    'user',
    content: '¿Cuál es el esquema de primera línea recomendado para un paciente de 68 años con mieloma múltiple recién diagnosticado, sin comorbilidades relevantes?',
  },
  {
    role:    'assistant',
    content: 'En pacientes no candidatos a trasplante, el estándar de primera línea es lenalidomida-bortezomib-dexametasona (RVd) o daratumumab-lenalidomida-dexametasona (Dara-Rd), según los criterios de SWOG S0777 y MAIA respectivamente. Ambos esquemas han demostrado mejoría significativa en supervivencia libre de progresión frente a Rd solo.',
  },
]

function buildPrompt(message: string): string {
  const historialTexto = HISTORIAL
    .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
    .join('\n')

  return `Dado el siguiente historial de conversación y la pregunta nueva del usuario, haz dos cosas:
1. Si la pregunta nueva depende del contexto previo para tener sentido (usa pronombres, es elíptica, o es un seguimiento directo del mismo tema), reescríbela como una pregunta autónoma y completa que incluya el contexto necesario.
2. Indica si la pregunta nueva (ya reescrita o no) sigue siendo sobre el mismo dominio temático general que la conversación previa, o si es un cambio de tema hacia algo no relacionado.

Responde ÚNICAMENTE en este formato JSON, sin texto adicional:
{"rewritten_query": "...", "same_domain": true|false}

HISTORIAL:
${historialTexto}

PREGUNTA NUEVA: ${message}`
}

type RewriteResult = {
  rewritten_query: string
  same_domain:     boolean
}

async function classify(message: string): Promise<RewriteResult | { error: string }> {
  try {
    const res = await anthropic.messages.create({
      model:      HAIKU_MODEL,
      max_tokens: 300,
      messages:   [{ role: 'user', content: buildPrompt(message) }],
    })

    const textBlock = res.content.find(b => b.type === 'text')
    if (!textBlock) return { error: 'sin bloque de texto en la respuesta' }

    const raw = textBlock.text.trim()
    // Tolerante a fences ```json ... ``` por si el modelo los agrega pese a la instrucción.
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

    const parsed = JSON.parse(jsonText)
    if (typeof parsed.rewritten_query !== 'string' || typeof parsed.same_domain !== 'boolean') {
      return { error: `JSON con forma inesperada: ${jsonText}` }
    }
    return parsed as RewriteResult
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

async function main() {
  console.log('\n🔬  Calibración de reescritura + clasificación de dominio — MSL Virtual\n')
  console.log(`   ${TEST_CASES.length} casos de prueba · modelo: ${HAIKU_MODEL}\n`)

  type Row = {
    question:        string
    category:        Category
    expected:        boolean
    same_domain:     boolean | null
    rewritten_query: string
    correct:         boolean
    error?:          string
  }

  const rows: Row[] = []

  for (const tc of TEST_CASES) {
    const expected = tc.category === 'debe_pasar'
    const result   = await classify(tc.question)

    if ('error' in result) {
      rows.push({
        question: tc.question, category: tc.category, expected,
        same_domain: null, rewritten_query: '', correct: false, error: result.error,
      })
      continue
    }

    rows.push({
      question:        tc.question,
      category:        tc.category,
      expected,
      same_domain:     result.same_domain,
      rewritten_query: result.rewritten_query,
      correct:         result.same_domain === expected,
    })
  }

  // ── Tabla ──────────────────────────────────────────────────────────────────
  const col1 = Math.max(...rows.map(r => r.question.length), 'Pregunta'.length)
  const col2 = Math.max(...rows.map(r => truncate(r.rewritten_query, 60).length), 'Rewritten query'.length)

  const header = `${'Pregunta'.padEnd(col1)} | ${'same_domain'.padEnd(12)} | ${'esperado'.padEnd(8)} | ${'OK'.padEnd(3)} | ${'Rewritten query'.padEnd(col2)}`
  console.log(header)
  console.log('─'.repeat(header.length))

  for (const cat of ['debe_pasar', 'debe_fallar'] as Category[]) {
    for (const r of rows.filter(r => r.category === cat)) {
      const sd  = r.error ? `ERROR` : String(r.same_domain)
      const exp = String(r.expected)
      const ok  = r.error ? '✗' : (r.correct ? '✓' : '✗')
      const rq  = r.error ? r.error : truncate(r.rewritten_query, 60)
      console.log(`${r.question.padEnd(col1)} | ${sd.padEnd(12)} | ${exp.padEnd(8)} | ${ok.padEnd(3)} | ${rq.padEnd(col2)}`)
    }
    console.log('')
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  const pasarRows  = rows.filter(r => r.category === 'debe_pasar')
  const fallarRows = rows.filter(r => r.category === 'debe_fallar')
  const pasarOk  = pasarRows.filter(r => r.correct).length
  const fallarOk = fallarRows.filter(r => r.correct).length
  const errors   = rows.filter(r => r.error).length

  console.log('─'.repeat(50))
  console.log(`   debe_pasar  correctos (same_domain=true):  ${pasarOk}/${pasarRows.length}`)
  console.log(`   debe_fallar correctos (same_domain=false): ${fallarOk}/${fallarRows.length}`)
  if (errors > 0) console.log(`   ⚠️  ${errors} caso(s) con error de llamada/parseo — ver tabla arriba`)
  console.log('─'.repeat(50))

  if (pasarOk === pasarRows.length && fallarOk === fallarRows.length) {
    console.log('\n✅ Clasificación perfecta en los 20 casos.\n')
  } else {
    console.log('\n⚠️  Hay errores de clasificación — revisa los casos marcados con ✗ antes de integrar.\n')
  }
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
