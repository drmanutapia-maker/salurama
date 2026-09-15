// Búsqueda más profunda para UNA patología puntual de
// data/msl-literature/diseases.json — mismo pipeline exacto que
// scripts/ingest-msl-literature.js (E-utilities + mismo parser + mismo
// filtro de licencia CC0/CC BY/CC BY-SA/CC BY-ND), reusado vía require, sin
// ninguna lógica duplicada. La diferencia es solo el retmax de ESearch: el
// batch normal examina los primeros 15 PMIDs por patología (RETMAX_PER_DISEASE,
// pensado para correr las 27 patologías de un jalón); este script existe para
// cuando esos 15 no alcanzan a cubrir el ángulo clínico que se necesita y hay
// que revisar más abajo en la lista de resultados de una sola patología.
//
// Uso:
//   node --use-system-ca scripts/ingest-msl-literature-deep.js <pathology> [--retmax=N]
//
// <pathology> debe existir ya en data/msl-literature/diseases.json (mismo
// mesh_query/cie10_codes que usa el batch normal — no se inventa uno nuevo).
// --retmax por defecto 150 (suficiente margen sobre el total típico de una
// sola patología; no es "sin límite" a propósito, para no disparar un jalón
// descontrolado de NCBI por accidente).

const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const fs   = require('fs')
const path = require('path')
const {
  extractLicense, extractMeta, chunkArticle,
  xmlParser, xmlParserOrdered, findTag,
  esearchPubmed, elinkPubmedToPmc, efetchPmcFullXml, sleep, getEmbeddings,
  supabase, NCBI_DELAY_MS, EMBED_BATCH, EMBED_DELAY_MS,
} = require('./ingest-msl-literature')

const DISEASES_FILE   = path.join(process.cwd(), 'data', 'msl-literature', 'diseases.json')
const DEFAULT_RETMAX  = 150

function parseArgs(argv) {
  const [pathology, ...rest] = argv
  let retmax = DEFAULT_RETMAX
  for (const arg of rest) {
    const m = arg.match(/^--retmax=(\d+)$/)
    if (m) retmax = parseInt(m[1], 10)
  }
  return { pathology, retmax }
}

async function main() {
  const { pathology, retmax } = parseArgs(process.argv.slice(2))
  if (!pathology) {
    console.error('Uso: node --use-system-ca scripts/ingest-msl-literature-deep.js <pathology> [--retmax=N]')
    process.exit(1)
  }

  const diseases = JSON.parse(fs.readFileSync(DISEASES_FILE, 'utf-8'))
  const disease  = diseases.find(d => d.pathology === pathology)
  if (!disease) {
    console.error(`❌ "${pathology}" no existe en data/msl-literature/diseases.json`)
    process.exit(1)
  }

  console.log(`\n🔬  Búsqueda profunda — MSL Literature Ingestion\n`)
  console.log(`📚 ${disease.pathology} (CIE-10: ${disease.cie10_codes.join(', ')}) — retmax=${retmax}`)

  const pmids = await esearchPubmed(disease.mesh_query, retmax)
  await sleep(NCBI_DELAY_MS)
  console.log(`   ESearch: ${pmids.length} PMIDs`)
  if (pmids.length === 0) return

  const pmcids = await elinkPubmedToPmc(pmids)
  await sleep(NCBI_DELAY_MS)
  console.log(`   ELink: ${pmcids.length} con texto completo en PMC`)

  let totalProcessed = 0, totalSkippedLicense = 0, totalSkippedExisting = 0, totalErrors = 0

  for (const pmcid of pmcids) {
    const fullPmcid = `PMC${pmcid}`
    try {
      const { data: existing } = await supabase
        .from('msl_documents')
        .select('id')
        .eq('pmcid', fullPmcid)
        .maybeSingle()

      if (existing) {
        console.log(`   ⏭️  ${fullPmcid} ya ingestado`)
        totalSkippedExisting++
        continue
      }

      const xml = await efetchPmcFullXml(pmcid)
      await sleep(NCBI_DELAY_MS)

      const parsed = xmlParser.parse(xml)
      const article = parsed['pmc-articleset']?.article ?? parsed.article
      if (!article) {
        console.log(`   ❌ ${fullPmcid}: XML sin <article>`)
        totalErrors++
        continue
      }

      const license = extractLicense(article)
      if (!license) {
        console.log(`   🚫 ${fullPmcid}: licencia no comercial o no reconocida — omitido`)
        totalSkippedLicense++
        continue
      }

      const parsedOrdered = xmlParserOrdered.parse(xml)
      const articleSetOrdered = findTag(parsedOrdered, 'pmc-articleset')
      const articleOrdered = (articleSetOrdered ? findTag(articleSetOrdered, 'article') : null)
        ?? findTag(parsedOrdered, 'article')
      if (!articleOrdered) {
        console.log(`   ❌ ${fullPmcid}: XML sin <article> (parseo ordenado)`)
        totalErrors++
        continue
      }

      const meta   = extractMeta(articleOrdered)
      const chunks = chunkArticle(articleOrdered)
      if (chunks.length === 0) {
        console.log(`   ❌ ${fullPmcid}: sin secciones de cuerpo extraíbles`)
        totalErrors++
        continue
      }

      console.log(`   📄 ${fullPmcid} [${license}] "${meta.title.slice(0, 60)}" → ${chunks.length} chunks`)

      const { data: doc, error: docErr } = await supabase
        .from('msl_documents')
        .insert({
          title:       meta.title,
          authors:     meta.authors,
          journal:     meta.journal,
          year:        meta.year,
          doi:         meta.doi,
          specialty:   'hematologia',
          pathology:   disease.pathology,
          sponsor:     null,
          content:     chunks.map(c => c.content).join('\n\n'),
          verified:    true,
          source_type: 'paper',
          pmid:        meta.pmid,
          pmcid:       fullPmcid,
          license,
          cie10_codes: disease.cie10_codes,
        })
        .select('id')
        .single()

      if (docErr) throw docErr

      const chunkTexts = chunks.map(c => `${c.label}\n\n${c.content}`)
      const allEmbeddings = []
      for (let b = 0; b < chunkTexts.length; b += EMBED_BATCH) {
        const batch = chunkTexts.slice(b, b + EMBED_BATCH)
        const embs  = await getEmbeddings(batch)
        allEmbeddings.push(...embs)
        if (b + EMBED_BATCH < chunkTexts.length) await sleep(EMBED_DELAY_MS)
      }

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

      console.log(`   ✅ ${chunks.length} chunks listos`)
      totalProcessed++
    } catch (err) {
      console.error(`   ❌ ${fullPmcid}: ${err instanceof Error ? err.message : err}`)
      totalErrors++
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`📊 ${totalProcessed} artículos ingeridos | ${totalSkippedLicense} omitidos por licencia | ${totalSkippedExisting} ya existentes | ${totalErrors} errores`)
  console.log('─'.repeat(50) + '\n')
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error fatal:', err)
    process.exit(1)
  })
}
