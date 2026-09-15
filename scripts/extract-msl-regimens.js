// Extracción de esquemas de tratamiento (quimioterapia) — MSL Virtual
// Componente 2. Tabla separada del RAG semántico (msl_regimens) porque dosis
// y ciclos deben citarse EXACTOS, no parafrasearse con un LLM libre.
//
// Uso:
//   node --use-system-ca scripts/extract-msl-regimens.js
//
// Reusa artículos ya ingeridos por scripts/ingest-msl-literature.js
// (msl_documents.content, ya filtrados a licencia oa_comm) — no vuelve a
// pegarle a la red de NCBI. Claude extrae candidatos estructurados con una
// cita textual (source_excerpt) por cada esquema, y ese excerpt se verifica
// programáticamente como substring EXACTO del contenido original antes de
// insertar — si Claude parafraseó o inventó la cita, el esquema se descarta,
// no se inserta "a medias".
//
// Todo entra con review_status='pendiente_revision'. Nada de esto se usa en
// el chat hasta aprobación clínica explícita por esquema (fuera de alcance
// de este script — no hay UI de aprobación todavía).

const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const path = require('path')
const fs = require('fs')
const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')

const TARGET_PATHOLOGIES_FILE = path.join(process.cwd(), 'data', 'msl-literature', 'regimen-target-pathologies.json')
const CLAUDE_MODEL = 'claude-sonnet-4-6'

const ANTHROPIC_API_KEY    = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!ANTHROPIC_API_KEY)    throw new Error('❌ Falta ANTHROPIC_API_KEY en .env.local')
if (!SUPABASE_URL)         throw new Error('❌ Falta NEXT_PUBLIC_SUPABASE_URL en .env.local')
if (!SUPABASE_SERVICE_KEY) throw new Error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local')

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
const supabase  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const EXTRACTION_PROMPT = `Eres un asistente que extrae esquemas de tratamiento oncohematológico de un artículo científico para una base de datos clínica estructurada.

Extrae TODOS los esquemas de tratamiento mencionados que tengan información CONCRETA de dosis y/o ciclos (ignora menciones vagas sin datos numéricos específicos).

Para cada esquema, devuelve un objeto JSON con:
- "regimen_name": nombre corto del esquema (ej. "R-CHOP", "Venetoclax + Azacitidina")
- "treatment_line": una de estas opciones exactas: "primera_linea", "segunda_linea", "recaida_refractario", "mantenimiento", o null si no es claro
- "drugs": arreglo de {"name": "...", "dose": "..." o null, "route": "..." o null}
- "cycles": descripción del esquema de ciclos como texto, o null si no se especifica
- "source_excerpt": una cita TEXTUAL EXACTA copiada palabra por palabra del artículo (abajo) que respalda la dosis/ciclo de este esquema — esto se verificará programáticamente como substring exacto del texto original, así que debe ser una copia literal, NUNCA una paráfrasis ni un resumen.

Reglas estrictas:
- No inventes ni infieras dosis que no estén explícitamente en el texto.
- Si el artículo no tiene ningún esquema con dosis/ciclos concretos, devuelve un arreglo vacío.
- Responde ÚNICAMENTE con un arreglo JSON válido, sin texto adicional ni markdown.

ARTÍCULO:
`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function extractRegimensFromText(text) {
  const truncated = text.length > 60000 ? text.slice(0, 60000) : text // margen de contexto razonable
  const res = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: EXTRACTION_PROMPT + truncated }],
  })
  const textBlock = res.content.find(b => b.type === 'text')
  if (!textBlock) return []
  const raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    console.error('   ⚠️  Respuesta de Claude no es JSON válido, se omite este artículo')
    return []
  }
}

async function main() {
  console.log('\n💊  MSL Regimen Extraction — Salurama (Componente 2)\n')

  const targets = JSON.parse(fs.readFileSync(TARGET_PATHOLOGIES_FILE, 'utf-8'))
  console.log(`📚 Patologías objetivo: ${targets.map(t => t.pathology).join(', ')}\n`)

  let totalInserted = 0, totalDiscardedNoMatch = 0, totalArticles = 0

  for (const target of targets) {
    const { data: docs, error } = await supabase
      .from('msl_documents')
      .select('id, title, content, pmcid, license, pathology')
      .eq('pathology', target.pathology)
      .not('pmcid', 'is', null)

    if (error) { console.error('Error consultando documentos:', error); continue }
    console.log(`📖 ${target.pathology}: ${docs.length} artículo(s) ya ingeridos`)

    for (const doc of docs) {
      totalArticles++
      console.log(`   🔎 ${doc.pmcid} "${doc.title.slice(0, 60)}"`)

      let candidates
      try {
        candidates = await extractRegimensFromText(doc.content)
      } catch (err) {
        console.error(`   ❌ Error de Claude: ${err instanceof Error ? err.message : err}`)
        continue
      }
      await sleep(600)

      if (candidates.length === 0) {
        console.log('      (sin esquemas con dosis/ciclos concretos)')
        continue
      }

      for (const c of candidates) {
        const excerpt = typeof c.source_excerpt === 'string' ? c.source_excerpt : ''
        const verbatimMatch = excerpt.length > 0 && doc.content.includes(excerpt)

        if (!verbatimMatch) {
          console.log(`      🚫 "${c.regimen_name}" descartado — la cita no es substring exacto del artículo (posible paráfrasis/alucinación)`)
          totalDiscardedNoMatch++
          continue
        }

        const { error: insErr } = await supabase.from('msl_regimens').insert({
          regimen_name:       c.regimen_name ?? 'Esquema sin nombre',
          pathology:           target.pathology,
          cie10_codes:         target.cie10_codes,
          treatment_line:      c.treatment_line ?? null,
          drugs:                c.drugs ?? [],
          cycles:               c.cycles ?? null,
          source_document_id:   doc.id,
          source_pmcid:         doc.pmcid,
          source_license:       doc.license,
          source_excerpt:       excerpt,
          review_status:        'pendiente_revision',
        })

        if (insErr) {
          console.error(`      ❌ Error insertando "${c.regimen_name}":`, insErr.message)
        } else {
          console.log(`      ✅ "${c.regimen_name}" — pendiente de revisión clínica`)
          totalInserted++
        }
      }
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`📊 ${totalArticles} artículos revisados | ${totalInserted} esquemas insertados (pendiente_revision) | ${totalDiscardedNoMatch} descartados por cita no verbatim`)
  console.log('─'.repeat(50) + '\n')
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error fatal:', err)
    process.exit(1)
  })
}

module.exports = { extractRegimensFromText }
