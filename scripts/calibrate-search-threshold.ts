// Script de calibración — uso único, NO se integra a producción.
//
// Objetivo: medir la similitud coseno del top-1 chunk cuando se embebe el
// mensaje del usuario AISLADO (sin contexto conversacional previo), para
// encontrar un "piso" que distinga preguntas de seguimiento legítimas
// (elípticas, dependen del contexto) de preguntas genuinamente fuera de
// dominio, incluso cuando aparecen dentro de una conversación de mieloma.
//
// Uso:
//   npx tsx scripts/calibrate-search-threshold.ts

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { TEST_CASES, type Category, type TestCase } from './calibration-test-cases'

const EMBEDDING_MODEL = 'text-embedding-3-small'

const OPENAI_API_KEY       = process.env.OPENAI_API_KEY
const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!OPENAI_API_KEY)       throw new Error('❌ Falta OPENAI_API_KEY en .env.local')
if (!SUPABASE_URL)         throw new Error('❌ Falta NEXT_PUBLIC_SUPABASE_URL en .env.local')
if (!SUPABASE_SERVICE_KEY) throw new Error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local')

const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Utilidades ────────────────────────────────────────────────────────────────

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts })
  return res.data.map(d => d.embedding)
}

type RpcRow = { similarity: number }

async function topSimilarity(embedding: number[]): Promise<number | null> {
  const { data, error } = await supabase.rpc('match_msl_chunks', {
    query_embedding: embedding,
    match_threshold: -1,   // sin filtrar — queremos el top-1 real aunque sea muy bajo
    match_count:     1,
  })

  if (error) {
    console.error('❌ Error en match_msl_chunks:', error)
    return null
  }

  const rows = (data ?? []) as RpcRow[]
  return rows.length > 0 ? rows[0].similarity : null
}

function fmt(n: number | null): string {
  return n === null ? 'sin resultados' : n.toFixed(4)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔬  Calibración de piso de similitud — MSL Virtual\n')
  console.log(`   ${TEST_CASES.length} casos de prueba · modelo: ${EMBEDDING_MODEL}\n`)

  const embeddings = await getEmbeddings(TEST_CASES.map(c => c.question))

  const results: Array<TestCase & { similarity: number | null }> = []

  for (let i = 0; i < TEST_CASES.length; i++) {
    const similarity = await topSimilarity(embeddings[i])
    results.push({ ...TEST_CASES[i], similarity })
  }

  // ── Tabla ──────────────────────────────────────────────────────────────────
  const col1 = Math.max(...results.map(r => r.question.length), 'Pregunta'.length)
  const header = `${'Pregunta'.padEnd(col1)} | Similitud | Categoría esperada | Nota`
  console.log(header)
  console.log('─'.repeat(header.length + 20))

  for (const cat of ['debe_pasar', 'debe_fallar'] as Category[]) {
    for (const r of results.filter(r => r.category === cat)) {
      console.log(
        `${r.question.padEnd(col1)} | ${fmt(r.similarity).padStart(9)} | ${r.category.padEnd(19)} | ${r.note}`
      )
    }
    console.log('')
  }

  // ── Análisis de separación ────────────────────────────────────────────────
  const pasarVals  = results.filter(r => r.category === 'debe_pasar'  && r.similarity !== null).map(r => r.similarity as number)
  const fallarVals = results.filter(r => r.category === 'debe_fallar' && r.similarity !== null).map(r => r.similarity as number)

  if (pasarVals.length === 0 || fallarVals.length === 0) {
    console.log('⚠️  No hay suficientes resultados para calcular una separación. Revisa errores arriba.\n')
    return
  }

  const minPasar  = Math.min(...pasarVals)
  const maxFallar = Math.max(...fallarVals)

  console.log('─'.repeat(50))
  console.log(`   Mínimo entre "debe pasar":   ${minPasar.toFixed(4)}`)
  console.log(`   Máximo entre "debe fallar":  ${maxFallar.toFixed(4)}`)
  console.log('─'.repeat(50))

  if (minPasar > maxFallar) {
    const margin = minPasar - maxFallar
    const suggested = maxFallar + margin / 2
    console.log(`\n✅ Separación limpia (margen de ${margin.toFixed(4)}).`)
    console.log(`   Piso sugerido (punto medio): ${suggested.toFixed(4)}\n`)
  } else {
    console.log(`\n⚠️  Los grupos se solapan — no hay un piso único que separe limpiamente ambos.`)
    console.log(`   Revisa los casos individuales en la tabla de arriba antes de fijar un valor.\n`)
  }
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
