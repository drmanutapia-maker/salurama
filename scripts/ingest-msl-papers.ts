// ARCHIVO DE REFERENCIA — NO EJECUTAR DIRECTAMENTE
// tsx falla con OOM en PDFs grandes (compilación consume ~2 GB de heap).
// El archivo canónico y ejecutable es: scripts/ingest-msl-papers.js
// Mantener este .ts solo como fuente de tipos e intención original.

/**
 * Ingestión de papers MSL — Salurama
 *
 * Uso:
 *   node --use-system-ca scripts/ingest-msl-papers.js
 *
 * Papers en: data/msl-papers/  (PDF o TXT)
 * Metadatos opcionales: data/msl-papers/papers.json
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import * as fs from 'fs'
import * as path from 'path'
import { execFileSync } from 'child_process'
import * as os from 'os'
import * as crypto from 'crypto'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────
const PAPERS_DIR      = path.join(process.cwd(), 'data', 'msl-papers')
const CHUNK_SIZE      = 2000   // chars ≈ 500 tokens
const CHUNK_OVERLAP   = 200    // chars ≈ 50 tokens
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBED_BATCH     = 20     // max textos por llamada a OpenAI
const EMBED_DELAY_MS  = 600    // pausa entre batches para no exceder rate limit

// ── Validación de entorno ─────────────────────────────────────
const OPENAI_API_KEY       = process.env.OPENAI_API_KEY
const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!OPENAI_API_KEY)       throw new Error('❌ Falta OPENAI_API_KEY en .env.local')
if (!SUPABASE_URL)         throw new Error('❌ Falta NEXT_PUBLIC_SUPABASE_URL en .env.local')
if (!SUPABASE_SERVICE_KEY) throw new Error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local')

// ── Clientes (lazy init — no a nivel de módulo) ───────────────
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Tipos ─────────────────────────────────────────────────────
interface PaperMeta {
  file:       string
  title:      string
  authors?:   string
  journal?:   string
  year?:      number
  doi?:       string
  sponsor?:   string
  specialty?: string
  pathology?: string
  verified?:  boolean
}

// ── Utilidades ────────────────────────────────────────────────

function loadManifest(): Record<string, PaperMeta> {
  const manifestPath = path.join(PAPERS_DIR, 'papers.json')
  if (!fs.existsSync(manifestPath)) return {}
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PaperMeta[]
  return Object.fromEntries(data.map(p => [p.file, p]))
}

function metaFromFilename(filename: string): PaperMeta {
  const name      = path.basename(filename, path.extname(filename))
  const yearMatch = name.match(/\b(19|20)\d{2}\b/)
  const year      = yearMatch ? parseInt(yearMatch[0]) : undefined
  const title     = name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  return { file: filename, title: title || name, year }
}

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.txt' || ext === '.md') {
    return fs.readFileSync(filePath, 'utf-8')
  }
  if (ext === '.pdf') {
    const workerPath = path.join(process.cwd(), 'scripts', 'pdf-extract-worker.cjs')
    const outFile    = path.join(os.tmpdir(), `msl-${crypto.randomBytes(6).toString('hex')}.txt`)
    try {
      execFileSync(process.execPath, [workerPath, filePath, outFile], { stdio: 'ignore' })
      return fs.readFileSync(outFile, 'utf8')
    } finally {
      if (fs.existsSync(outFile)) fs.unlinkSync(outFile)
    }
  }
  throw new Error(`Formato no soportado: ${ext}. Usa .pdf o .txt`)
}

// Boilerplate repetido en cada página de los PDFs de guías NCCN (marca de agua
// de impresión + encabezado de versión). No aporta contenido clínico y diluye
// la similitud semántica de los chunks reales frente a preguntas amplias
// ("Define X") porque el mismo texto se repite decenas de veces en el corpus.
// Genérico (sin atar nombre/fecha/año/versión específicos) para que sirva en
// futuras ingestas de otras guías NCCN.
const RE_NCCN_PRINT_WATERMARK = /PLEASE NOTE that use of this NCCN Content is governed by the End-User License Agreement,\s*and you MAY NOT distribute this Content or use it with any artificial intelligence model or tool\.\s*Printed by [^.]+?\.\s*Copyright ©\s*\d{4}\s*National Comprehensive Cancer Network,\s*Inc\.\s*All Rights Reserved\.\s*/g
const RE_NCCN_PAGE_HEADER = /NCCN Guidelines Version [\d.]+\s*\n[^\n]+\s*\nVersion [\d.]+,\s*[\d/]+\s*©\s*\d{4}\s*National Comprehensive Cancer Network\s*®?\s*\(NCCN\s*®?\s*\),\s*All rights reserved\.\s*NCCN Guidelines\s*®?\s*and this illustration may not be reproduced in any form without the express written permission of NCCN\.\s*/g

function stripPdfBoilerplate(text: string): string {
  return text
    .replace(RE_NCCN_PRINT_WATERMARK, '')
    .replace(RE_NCCN_PAGE_HEADER, '')
}

function chunkText(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const chunks: string[] = []
  let start = 0

  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_SIZE, normalized.length)

    if (end < normalized.length) {
      const parBreak = normalized.lastIndexOf('\n\n', end)
      if (parBreak > start + CHUNK_SIZE * 0.6) {
        end = parBreak + 2
      } else {
        const sentBreak = normalized.lastIndexOf('. ', end)
        if (sentBreak > start + CHUNK_SIZE * 0.5) {
          end = sentBreak + 2
        } else {
          const wordBreak = normalized.lastIndexOf(' ', end)
          if (wordBreak > start) end = wordBreak + 1
        }
      }
    }

    const chunk = normalized.slice(start, end).trim()
    if (chunk.length > 100) chunks.push(chunk)

    const next = end - CHUNK_OVERLAP
    start = next > start ? next : end // guarantee forward progress
    if (start >= normalized.length) break
  }

  return chunks
}

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })
  return response.data.map(d => d.embedding)
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('\n🔬  MSL Paper Ingestion — Salurama\n')

  if (!fs.existsSync(PAPERS_DIR)) {
    fs.mkdirSync(PAPERS_DIR, { recursive: true })
    console.log(`📁 Carpeta creada: ${PAPERS_DIR}`)
    console.log('   Agrega tus papers (.pdf o .txt) y vuelve a correr el script.\n')
    return
  }

  const manifest = loadManifest()
  const files    = fs.readdirSync(PAPERS_DIR)
    .filter(f => /\.(pdf|txt|md)$/i.test(f))
    .sort()

  if (files.length === 0) {
    console.log('⚠️  No hay papers en data/msl-papers/\n')
    return
  }

  console.log(`📚 ${files.length} archivo(s) encontrado(s)\n`)

  let processed = 0, skipped = 0, errors = 0

  for (let i = 0; i < files.length; i++) {
    const filename = files[i]
    const filePath = path.join(PAPERS_DIR, filename)
    const meta     = manifest[filename] ?? metaFromFilename(filename)

    console.log(`[${i + 1}/${files.length}] ${meta.title}`)

    // Idempotente: omitir si ya existe
    const { data: existing } = await supabase
      .from('msl_documents')
      .select('id')
      .eq('title', meta.title)
      .maybeSingle()

    if (existing) {
      console.log(`    ⏭️  Ya ingestado — omitiendo\n`)
      skipped++
      continue
    }

    try {
      // 1. Extraer texto
      process.stdout.write('    📄 Extrayendo texto... ')
      const text   = stripPdfBoilerplate(await extractText(filePath))
      const chunks = chunkText(text)
      console.log(`${text.length.toLocaleString()} chars → ${chunks.length} chunks`)

      // 2. Insertar documento
      const { data: doc, error: docErr } = await supabase
        .from('msl_documents')
        .insert({
          title:     meta.title,
          authors:   meta.authors   ?? null,
          journal:   meta.journal   ?? null,
          year:      meta.year      ?? null,
          doi:       meta.doi       ?? null,
          specialty: meta.specialty ?? 'hematologia',
          pathology: meta.pathology ?? 'mieloma_multiple',
          sponsor:   meta.sponsor   ?? null,
          content:   text,
          verified:  meta.verified  ?? false,
        })
        .select('id')
        .single()

      if (docErr) throw docErr

      // 3. Generar embeddings en batches
      process.stdout.write('    🧠 Embeddings')
      const allEmbeddings: number[][] = []

      for (let b = 0; b < chunks.length; b += EMBED_BATCH) {
        const batch = chunks.slice(b, b + EMBED_BATCH)
        const embs  = await getEmbeddings(batch)
        allEmbeddings.push(...embs)
        process.stdout.write('.')
        if (b + EMBED_BATCH < chunks.length) await sleep(EMBED_DELAY_MS)
      }
      console.log(' ✓')

      // 4. Insertar chunks en lotes de 50
      process.stdout.write('    💾 Insertando chunks...')
      const chunkRows = chunks.map((content, idx) => ({
        document_id: doc.id,
        chunk_index: idx,
        content,
        embedding: allEmbeddings[idx],
      }))

      for (let b = 0; b < chunkRows.length; b += 50) {
        const { error } = await supabase
          .from('msl_chunks')
          .insert(chunkRows.slice(b, b + 50))
        if (error) throw error
      }
      console.log(' ✓')

      console.log(`    ✅ ${chunks.length} chunks listos\n`)
      processed++

    } catch (err) {
      console.error(`    ❌ Error: ${err instanceof Error ? err.message : err}\n`)
      errors++
    }
  }

  console.log('─'.repeat(50))
  console.log(`📊 ${processed} procesados | ${skipped} omitidos | ${errors} errores`)
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
