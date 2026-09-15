// Ingestión de documentos regulatorios (NOMs mexicanas + notas aclaratorias) — MSL Virtual
//
// Uso:
//   node --use-system-ca scripts/ingest-msl-regulatory.js
//
// Distinto de scripts/ingest-msl-papers.js: el shape de metadata es de norma
// (número de norma, estatus regulatorio, fecha de publicación real) en vez de
// paper académico (autor/journal/DOI). Chunking por cláusula numerada en vez
// de tamaño fijo, porque las NOM son documentos legales con cortes naturales
// de sección (ej. "6. Especificaciones", "3.1.4 Definición...").
//
// Documentos en: data/msl-regulatory/  (.txt, ya extraídos de PDF)
// Metadatos en:  data/msl-regulatory/documents.json

const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const fs = require('fs')
const path = require('path')
const OpenAI = require('openai')
const { createClient } = require('@supabase/supabase-js')

const DOCS_DIR         = path.join(process.cwd(), 'data', 'msl-regulatory')
const EMBEDDING_MODEL  = 'text-embedding-3-small'
const EMBED_BATCH      = 20
const EMBED_DELAY_MS   = 600
const MAX_CLAUSE_CHARS = 2200
const CLAUSE_OVERLAP   = 300 // ~14% de MAX_CLAUSE_CHARS

const OPENAI_API_KEY       = process.env.OPENAI_API_KEY
const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!OPENAI_API_KEY)       throw new Error('❌ Falta OPENAI_API_KEY en .env.local')
if (!SUPABASE_URL)         throw new Error('❌ Falta NEXT_PUBLIC_SUPABASE_URL en .env.local')
if (!SUPABASE_SERVICE_KEY) throw new Error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local')

const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Chunking por cláusula numerada ──────────────────────────────────────────

// Encabezados de nivel superior: "6. Especificaciones", "3.1 Definiciones"
// (uno o dos niveles antes del primer espacio, seguido de mayúscula).
const HEADING_RE = /^[ \t]*(\d{1,2}(?:\.\d{1,2})?)\.?[ \t]*([A-ZÁÉÍÓÚÑ][^\n]{1,120})$/gm

function findHeadings(text) {
  const matches = []
  let m
  HEADING_RE.lastIndex = 0
  while ((m = HEADING_RE.exec(text)) !== null) {
    matches.push({ number: m[1], title: m[2].trim(), index: m.index, matchLength: m[0].length })
  }
  return matches
}

// Un encabezado es "real" (inicio de sección con contenido) si lo que sigue
// antes del siguiente encabezado es sustancial — así se descarta el bloque de
// tabla de contenidos (encabezados pegados unos a otros, sin cuerpo real).
function filterRealSections(matches, textLength) {
  const MIN_GAP = 350
  const real = []
  for (let i = 0; i < matches.length; i++) {
    const bodyStart = matches[i].index + matches[i].matchLength
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : textLength
    if (nextIndex - bodyStart >= MIN_GAP) real.push(matches[i])
  }
  return real
}

// Sub-chunking con traslape para secciones que exceden MAX_CLAUSE_CHARS —
// mismo criterio de corte suave (párrafo/oración/palabra) que ingest-msl-papers.js.
function splitOversizedSection(body) {
  const parts = []
  let start = 0
  while (start < body.length) {
    let end = Math.min(start + MAX_CLAUSE_CHARS, body.length)
    if (end < body.length) {
      const parBreak = body.lastIndexOf('\n\n', end)
      if (parBreak > start + MAX_CLAUSE_CHARS * 0.6) {
        end = parBreak + 2
      } else {
        const sentBreak = body.lastIndexOf('. ', end)
        if (sentBreak > start + MAX_CLAUSE_CHARS * 0.5) {
          end = sentBreak + 2
        } else {
          const wordBreak = body.lastIndexOf(' ', end)
          if (wordBreak > start) end = wordBreak + 1
        }
      }
    }
    const part = body.slice(start, end).trim()
    if (part.length > 50) parts.push(part)
    // Si este corte ya llegó al final del texto, no hay más contenido que
    // cubrir — parar aquí. (Bug previo: comparar el próximo `start` contra
    // body.length en vez de `end` producía una vuelta extra que repetía solo
    // los últimos caracteres del traslape como un chunk fantasma.)
    if (end >= body.length) break
    start = end - CLAUSE_OVERLAP
  }
  return parts
}

function chunkByClause(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const allHeadings  = findHeadings(normalized)
  const realHeadings = filterRealSections(allHeadings, normalized.length)

  if (realHeadings.length === 0) {
    // Documento sin cláusulas numeradas detectables (ej. la nota sintética) —
    // se trocea como un solo bloque de secciones por párrafo.
    return splitOversizedSection(normalized).map(content => ({ label: null, content }))
  }

  const chunks = []
  // Preámbulo (CONSIDERANDO, PREFACIO, fundamento legal) antes de la primera
  // cláusula real — se conserva como un chunk aparte en vez de descartarse.
  if (realHeadings[0].index > 200) {
    const pre = normalized.slice(0, realHeadings[0].index).trim()
    if (pre.length > 200) {
      chunks.push({
        label: 'Preámbulo / disposiciones previas',
        content: pre.length > MAX_CLAUSE_CHARS ? pre.slice(-MAX_CLAUSE_CHARS) : pre,
      })
    }
  }
  for (let i = 0; i < realHeadings.length; i++) {
    const h = realHeadings[i]
    const sectionStart = h.index
    const sectionEnd    = i + 1 < realHeadings.length ? realHeadings[i + 1].index : normalized.length
    const sectionText   = normalized.slice(sectionStart, sectionEnd).trim()
    const label         = `Cláusula ${h.number}. ${h.title}`

    if (sectionText.length <= MAX_CLAUSE_CHARS) {
      chunks.push({ label, content: sectionText })
    } else {
      const parts = splitOversizedSection(sectionText)
      parts.forEach((part, idx) => {
        chunks.push({ label: `${label} (parte ${idx + 1}/${parts.length})`, content: part })
      })
    }
  }
  return chunks
}

// ── Utilidades ────────────────────────────────────────────────────────────

function loadManifest() {
  const manifestPath = path.join(DOCS_DIR, 'documents.json')
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
}

async function getEmbeddings(texts) {
  const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts })
  return response.data.map(d => d.embedding)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📜  MSL Regulatory Ingestion — Salurama\n')

  if (!fs.existsSync(DOCS_DIR)) {
    console.log(`⚠️  No existe ${DOCS_DIR}\n`)
    return
  }

  const manifest = loadManifest()
  console.log(`📚 ${manifest.length} documento(s) en el manifiesto\n`)

  let processed = 0, skipped = 0, errors = 0

  for (let i = 0; i < manifest.length; i++) {
    const meta = manifest[i]
    console.log(`[${i + 1}/${manifest.length}] ${meta.title}`)

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
      const filePath = path.join(DOCS_DIR, meta.file)
      const text     = fs.readFileSync(filePath, 'utf-8')
      const chunks   = chunkByClause(text)
      console.log(`    📄 ${text.length.toLocaleString()} chars → ${chunks.length} chunks (por cláusula)`)

      const { data: doc, error: docErr } = await supabase
        .from('msl_documents')
        .insert({
          title:             meta.title,
          authors:           meta.authors           ?? null,
          journal:           meta.journal            ?? 'Diario Oficial de la Federación',
          year:              meta.year               ?? null,
          doi:               null,
          specialty:         meta.specialty          ?? 'hematologia',
          pathology:         meta.pathology          ?? 'regulatorio',
          sponsor:           null,
          content:           text,
          verified:          meta.verified           ?? true,
          source_type:       meta.source_type,
          document_code:     meta.document_code      ?? null,
          publication_date:  meta.publication_date   ?? null,
          regulatory_status: meta.regulatory_status  ?? null,
        })
        .select('id')
        .single()

      if (docErr) throw docErr

      process.stdout.write('    🧠 Embeddings')
      const chunkTexts = chunks.map(c => c.label ? `${c.label}\n\n${c.content}` : c.content)
      const allEmbeddings = []

      for (let b = 0; b < chunkTexts.length; b += EMBED_BATCH) {
        const batch = chunkTexts.slice(b, b + EMBED_BATCH)
        const embs  = await getEmbeddings(batch)
        allEmbeddings.push(...embs)
        process.stdout.write('.')
        if (b + EMBED_BATCH < chunkTexts.length) await sleep(EMBED_DELAY_MS)
      }
      console.log(' ✓')

      process.stdout.write('    💾 Insertando chunks...')
      const chunkRows = chunkTexts.map((content, idx) => ({
        document_id: doc.id,
        chunk_index: idx,
        content,
        embedding: allEmbeddings[idx],
      }))

      for (let b = 0; b < chunkRows.length; b += 50) {
        const { error } = await supabase.from('msl_chunks').insert(chunkRows.slice(b, b + 50))
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

if (require.main === module) {
  main().catch(err => {
    console.error('Error fatal:', err)
    process.exit(1)
  })
}

module.exports = { chunkByClause, getEmbeddings, sleep, supabase, EMBED_BATCH, EMBED_DELAY_MS }
