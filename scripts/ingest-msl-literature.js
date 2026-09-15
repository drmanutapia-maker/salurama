// Ingestión de literatura PubMed/PMC — MSL Virtual (Componente 1: corpus
// multipatología). Solo NCBI E-utilities oficiales (ESearch/ELink/EFetch) —
// CORE quedó excluido (su API gratuita es solo para uso no comercial).
//
// Uso:
//   node --use-system-ca scripts/ingest-msl-literature.js
//
// Enfermedades en: data/msl-literature/diseases.json (dirige la ingesta —
// cada chunk queda etiquetado con la patología/CIE-10 de su corrida, no por
// inferencia posterior).
//
// Filtro de licencia OBLIGATORIO: solo se ingieren artículos cuya licencia
// (leída del propio XML JATS, elemento <permissions><license>) sea del
// subconjunto comercialmente reutilizable de PMC — CC0, CC BY, CC BY-SA o
// CC BY-ND. Cualquier otra (CC BY-NC*, sin licencia clara, etc.) se descarta.
// El servicio oa.fcgi que antes servía esto fue descontinuado por NCBI en
// 2026 — la licencia se lee directamente del XML de cada artículo.
//
// IMPORTANTE: NO usar un User-Agent personalizado en las peticiones a NCBI —
// dispara su detección de abuso (probado en esta sesión: con UA custom,
// esearch.fcgi redirige a misuse.ncbi.nlm.nih.gov incluso con tool+email
// correctos; sin UA personalizado, funciona normal).

const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

const fs = require('fs')
const path = require('path')
const OpenAI = require('openai')
const { createClient } = require('@supabase/supabase-js')
const { XMLParser } = require('fast-xml-parser')

const DISEASES_FILE     = path.join(process.cwd(), 'data', 'msl-literature', 'diseases.json')
const EUTILS_BASE        = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const EMBEDDING_MODEL     = 'text-embedding-3-small'
const EMBED_BATCH         = 20
const EMBED_DELAY_MS      = 600
const MAX_CHUNK_CHARS     = 2200
const CHUNK_OVERLAP       = 300 // ~14%
const RETMAX_PER_DISEASE  = 15  // PMIDs a revisar por enfermedad (se filtran por PMC + licencia)
const NCBI_DELAY_MS       = 350 // ~3 req/seg sin API key (NCBI_API_KEY no configurada)

const OPENAI_API_KEY       = process.env.OPENAI_API_KEY
const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NCBI_TOOL            = 'salurama-msl'
const NCBI_EMAIL           = 'drmanutapia@gmail.com'

if (!OPENAI_API_KEY)       throw new Error('❌ Falta OPENAI_API_KEY en .env.local')
if (!SUPABASE_URL)         throw new Error('❌ Falta NEXT_PUBLIC_SUPABASE_URL en .env.local')
if (!SUPABASE_SERVICE_KEY) throw new Error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local')

const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' })

// Parser SOLO para extracción de texto (título, abstract, cuerpo) — con
// preserveOrder:true, a diferencia de xmlParser de arriba. Bug encontrado
// 2026-09-02 (sesión LLA, verificado carácter por carácter contra PMC7666128):
// sin preserveOrder, fast-xml-parser AGRUPA los hijos de un <p> por nombre de
// tag (todos los <sup> juntos, todos los <italic> juntos, todo el texto plano
// junto) en vez de mantener su orden real de aparición. Eso no es solo un
// problema de formato — es pérdida real de contenido: "MTX 1.5 g/m<sup>2</sup>"
// se leía "MTX 1.5 g/mand" (el "2" del exponente terminaba pegado a la
// palabra siguiente, sin espacio), y "the <italic>KMT2A</italic> rearrangement"
// se leía "therearrangement" (el nombre del gen desaparecía del todo).
// xmlParser (sin preserveOrder) se sigue usando para extractLicense() — ahí
// solo se leen atributos (@_xlink:href), que no sufren este problema.
// trimValues:false es necesario además de preserveOrder:true — por defecto
// fast-xml-parser recorta espacios de CADA nodo de texto, y cuando el único
// contenido de un nodo es un espacio simple (el que separa "the" de un
// <italic>BCR-ABL1</italic> inline), ese espacio se pierde por completo:
// "a lack of the BCR-ABL1 rearrangement" quedaba "a lack of theBCR-ABL1rearrangement".
const xmlParserOrdered = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text', preserveOrder: true, trimValues: false })

// Licencias del subconjunto oa_comm de PMC (uso comercial permitido) — deben
// coincidir con el CHECK constraint de msl_documents.license (migración MSL-005).
const LICENSE_URL_MAP = [
  { re: /creativecommons\.org\/publicdomain\/zero/i, label: 'CC0' },
  { re: /creativecommons\.org\/licenses\/by-sa\//i,   label: 'CC BY-SA' },
  { re: /creativecommons\.org\/licenses\/by-nd\//i,   label: 'CC BY-ND' },
  { re: /creativecommons\.org\/licenses\/by\//i,      label: 'CC BY' }, // debe ir después de by-sa/by-nd
]

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function ncbiFetch(url) {
  const res = await fetch(url) // sin User-Agent personalizado — ver nota arriba
  if (!res.ok) throw new Error(`NCBI ${res.status} — ${url}`)
  return res.text()
}

// ── ESearch / ELink / EFetch ────────────────────────────────────────────────

async function esearchPubmed(query, retmax = RETMAX_PER_DISEASE) {
  const url = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}` +
    `&retmax=${retmax}&retmode=json&tool=${NCBI_TOOL}&email=${encodeURIComponent(NCBI_EMAIL)}`
  const text = await ncbiFetch(url)
  const data = JSON.parse(text)
  return data.esearchresult?.idlist ?? []
}

async function elinkPubmedToPmc(pmids) {
  if (pmids.length === 0) return []
  const url = `${EUTILS_BASE}/elink.fcgi?dbfrom=pubmed&db=pmc&id=${pmids.join(',')}` +
    `&retmode=json&tool=${NCBI_TOOL}&email=${encodeURIComponent(NCBI_EMAIL)}`
  const text = await ncbiFetch(url)
  const data = JSON.parse(text)
  const linksetdbs = data.linksets?.[0]?.linksetdbs ?? []
  const pmcDb = linksetdbs.find(db => db.dbto === 'pmc')
  return pmcDb?.links ?? []
}

async function efetchPmcFullXml(pmcid) {
  const url = `${EUTILS_BASE}/efetch.fcgi?db=pmc&id=${pmcid}&rettype=full&retmode=xml` +
    `&tool=${NCBI_TOOL}&email=${encodeURIComponent(NCBI_EMAIL)}`
  return ncbiFetch(url)
}

// ── Parseo del XML JATS ──────────────────────────────────────────────────────
//
// Dos árboles distintos, a propósito:
//   - `article` (xmlParser, sin preserveOrder): usado SOLO por extractLicense,
//     que únicamente lee atributos (@_xlink:href) — no sufre el bug de orden.
//   - `articleOrdered` (xmlParserOrdered, preserveOrder:true): usado por
//     extractMeta y chunkArticle, que extraen texto humano/RAG y sí necesitan
//     el orden real de los nodos hijos dentro de <p>/<title>/<abstract>.
//
// Con preserveOrder:true, cada nodo es un objeto { tagName: hijos[], ':@': attrs }
// o un nodo de texto { '#text': '...' }, dentro de arreglos que SÍ conservan el
// orden original del XML — a diferencia del modo por defecto, que agrupa todos
// los hijos del mismo tag en un solo arreglo (perdiendo su posición real).

function findTag(nodes, tagName) {
  if (!Array.isArray(nodes)) return null
  const found = nodes.find(n => n && typeof n === 'object' && tagName in n)
  return found ? found[tagName] : null
}

function findAllTags(nodes, tagName) {
  if (!Array.isArray(nodes)) return []
  return nodes.filter(n => n && typeof n === 'object' && tagName in n).map(n => n[tagName])
}

function getAttr(nodes, tagName, attrName) {
  if (!Array.isArray(nodes)) return null
  const found = nodes.find(n => n && typeof n === 'object' && tagName in n)
  return found?.[':@']?.[attrName] ?? null
}

// Colapsa espacios/saltos de línea a un solo espacio y recorta extremos.
// Necesario porque trimValues:false (ver xmlParserOrdered) deja de recortar
// CADA nodo de texto individualmente — lo cual es correcto para no perder el
// espacio real entre "the" y un <italic> inline, pero como efecto secundario
// dejaría pasar la indentación del XML "pretty-printed" (saltos de línea +
// espacios de sangría) tal cual si no se normaliza al final, sobre el texto
// ya reensamblado completo.
function normalizeWs(s) {
  return s.replace(/\s+/g, ' ').trim()
}

// Tags de contenido INLINE — nunca se les antepone separador artificial,
// porque ya vienen rodeados de texto con su espacio real en el XML fuente
// (ej. "a lack of the <italic>BCR-ABL1</italic> rearrangement"). Cualquier
// tag que NO esté en esta lista se trata como bloque estructural y SÍ recibe
// un separador antes de su contenido — más seguro que enumerar cada tag de
// bloque uno por uno: el mismo bug de fusión de palabras apareció dos veces
// en la misma sesión (2026-09-07, corpus MGUS) con tags distintos cada vez
// (primero <table-wrap>/<td>/<tr>/<p> anidados dentro de un <p> — "First
// line• High-dose immunoglobulinSecond line" —, luego <label>/<caption> de
// tabla pegados al texto previo — "heparinTable 2Comparative features"). Una
// lista blanca de lo genuinamente inline es más robusta que perseguir cada
// tag de bloque nuevo que aparezca.
const INLINE_TAGS = new Set([
  '#text', 'italic', 'bold', 'sup', 'sub', 'underline', 'monospace',
  'xref', 'sc', 'styled-content', 'named-content', 'inline-formula', 'ext-link',
])

// Separador por defecto entre bloques ' ' (normalizeWs lo colapsa si el XML
// ya traía espacio propio); celdas/filas de tabla usan uno más visible para
// que el contenido siga siendo legible como tabla — mismo criterio que
// htmlTableToText en scripts/lookup-fda-label.js para openFDA.
const BLOCK_SEPARATOR_DEFAULT   = ' '
const BLOCK_SEPARATOR_OVERRIDES = { td: ' | ', th: ' | ', tr: ' || ' }

function tagNameOf(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return null
  const keys = Object.keys(node).filter(k => k !== ':@')
  return keys.length === 1 ? keys[0] : null
}

// Texto de UN elemento y sus hijos directos, EN ORDEN — sin separadores
// añadidos para contenido inline (ver INLINE_TAGS), pero SÍ con separador
// explícito antes de cualquier otro tag (bloque estructural) que aparezca
// como hermano no-inicial dentro de un mismo nivel.
function textOfOrdered(node) {
  if (node == null) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) {
    let out = ''
    for (let i = 0; i < node.length; i++) {
      const tag = tagNameOf(node[i])
      if (i > 0 && tag && !INLINE_TAGS.has(tag)) {
        out += BLOCK_SEPARATOR_OVERRIDES[tag] ?? BLOCK_SEPARATOR_DEFAULT
      }
      out += textOfOrdered(node[i])
    }
    return out
  }
  if (typeof node === 'object') {
    if ('#text' in node) return String(node['#text'])
    return Object.keys(node)
      .filter(k => k !== ':@')
      .map(k => textOfOrdered(node[k]))
      .join('')
  }
  return ''
}

function extractLicense(article) {
  const permissions = article?.front?.['article-meta']?.permissions
  if (!permissions) return null
  const licenseRef = permissions.license?.['ali:license_ref']
  const href = (typeof licenseRef === 'object' ? licenseRef['#text'] : licenseRef) ??
    permissions.license?.['@_xlink:href']
  if (!href) return null
  for (const { re, label } of LICENSE_URL_MAP) {
    if (re.test(href)) return label
  }
  return null // NC, no reconocida, o no comercial — se descarta en el caller
}

function extractMeta(articleOrdered) {
  const front = findTag(articleOrdered, 'front')
  const meta = findTag(front, 'article-meta')
  const journalMeta = findTag(front, 'journal-meta')

  const titleGroup = findTag(meta, 'title-group')
  const title = normalizeWs(textOfOrdered(findTag(titleGroup, 'article-title')))

  const contribGroup = findTag(meta, 'contrib-group')
  const contribs = (contribGroup ?? []).filter(n => n && typeof n === 'object' && 'contrib' in n)
  const authors = contribs
    .filter(c => c[':@']?.['@_contrib-type'] === 'author')
    .map(c => {
      const name = findTag(c.contrib, 'name')
      const surname = normalizeWs(textOfOrdered(findTag(name, 'surname')))
      const given = normalizeWs(textOfOrdered(findTag(name, 'given-names')))
      return [given, surname].filter(Boolean).join(' ')
    })
    .filter(Boolean)
    .join(', ') || null

  const journalTitleGroup = findTag(journalMeta, 'journal-title-group')
  const journal = normalizeWs(textOfOrdered(findTag(journalTitleGroup, 'journal-title'))) || null

  const pubDateNodes = findAllTags(meta, 'pub-date')
  const yearStr = pubDateNodes.map(d => normalizeWs(textOfOrdered(findTag(d, 'year')))).find(Boolean)
  const year = yearStr ? parseInt(yearStr, 10) : null

  const articleIdNodes = (meta ?? []).filter(n => n && typeof n === 'object' && 'article-id' in n)
  const doi  = normalizeWs(articleIdNodes.find(n => n[':@']?.['@_pub-id-type'] === 'doi')
    ?.['article-id']?.map(textOfOrdered).join('') ?? '') || null
  const pmid = normalizeWs(articleIdNodes.find(n => n[':@']?.['@_pub-id-type'] === 'pmid')
    ?.['article-id']?.map(textOfOrdered).join('') ?? '') || null

  return { title: title || 'Título desconocido', authors, journal, year, doi, pmid }
}

// Aplana el árbol de <sec> anidados en unidades de chunking, conservando la
// ruta de títulos como label (ej. "Main Text > Azacytidine combination therapy
// > Venetoclax"). `children` es el arreglo de hijos EN ORDEN de <body> o de un
// <sec> (formato preserveOrder) — nunca el árbol sin orden.
function flattenSections(children, pathTitles) {
  const units = []
  if (!Array.isArray(children)) return units

  // Texto de todos los <p> hijos DIRECTOS de este nivel, en orden, unidos con
  // espacio entre párrafos distintos (cada <p> internamente ya usa
  // textOfOrdered sin separador, que es lo correcto para su contenido inline).
  const directParagraphs = children
    .filter(n => n && typeof n === 'object' && 'p' in n)
    .map(n => textOfOrdered(n.p))
  const ownParagraphs = normalizeWs(directParagraphs.join(' '))
  if (ownParagraphs.length > 100) {
    units.push({ label: pathTitles.join(' > ') || '(sin título)', content: ownParagraphs })
  }

  const secNodes = children.filter(n => n && typeof n === 'object' && 'sec' in n)
  for (const s of secNodes) {
    const title = normalizeWs(textOfOrdered(findTag(s.sec, 'title'))) || '(sin título)'
    units.push(...flattenSections(s.sec, [...pathTitles, title]))
  }
  return units
}

function splitOversized(body) {
  const parts = []
  let start = 0
  while (start < body.length) {
    let end = Math.min(start + MAX_CHUNK_CHARS, body.length)
    if (end < body.length) {
      const parBreak = body.lastIndexOf('. ', end)
      if (parBreak > start + MAX_CHUNK_CHARS * 0.5) end = parBreak + 2
      else {
        const wordBreak = body.lastIndexOf(' ', end)
        if (wordBreak > start) end = wordBreak + 1
      }
    }
    const part = body.slice(start, end).trim()
    if (part.length > 50) parts.push(part)
    // Si este corte ya llegó al final del texto, no hay más contenido que
    // cubrir — parar aquí. (Bug previo: comparar el próximo `start` contra
    // body.length en vez de `end` producía una vuelta extra que repetía solo
    // los últimos ~300 caracteres —el traslape— como un chunk fantasma.)
    if (end >= body.length) break
    start = end - CHUNK_OVERLAP
  }
  return parts
}

function chunkArticle(articleOrdered) {
  const body = findTag(articleOrdered, 'body')
  if (!body) return []

  const meta = findTag(findTag(articleOrdered, 'front'), 'article-meta')
  const abstractChildren = findTag(meta, 'abstract')
  // El abstract puede traer <p> directos o subsecciones estructuradas
  // (Background/Methods/...); se recorre igual que el cuerpo para no perder
  // texto en ninguno de los dos casos, y se aplana a un solo bloque.
  const abstractUnits = abstractChildren ? flattenSections(abstractChildren, []) : []
  const abstractText = normalizeWs(abstractUnits.map(u => u.content).join(' '))

  const units = []
  if (abstractText.length > 50) units.push({ label: 'Abstract', content: abstractText })
  units.push(...flattenSections(body, []))

  const chunks = []
  for (const u of units) {
    if (u.content.length <= MAX_CHUNK_CHARS) {
      chunks.push(u)
    } else {
      const parts = splitOversized(u.content)
      parts.forEach((part, idx) => chunks.push({ label: `${u.label} (parte ${idx + 1}/${parts.length})`, content: part }))
    }
  }
  return chunks
}

async function getEmbeddings(texts) {
  const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts })
  return response.data.map(d => d.embedding)
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🧬  MSL Literature Ingestion — Salurama (PubMed/PMC)\n')

  const diseases = JSON.parse(fs.readFileSync(DISEASES_FILE, 'utf-8'))
  let totalProcessed = 0, totalSkippedLicense = 0, totalSkippedExisting = 0, totalErrors = 0

  for (const disease of diseases) {
    console.log(`\n📚 ${disease.pathology} (CIE-10: ${disease.cie10_codes.join(', ')})`)

    const pmids = await esearchPubmed(disease.mesh_query)
    await sleep(NCBI_DELAY_MS)
    console.log(`   ESearch: ${pmids.length} PMIDs`)
    if (pmids.length === 0) continue

    const pmcids = await elinkPubmedToPmc(pmids)
    await sleep(NCBI_DELAY_MS)
    console.log(`   ELink: ${pmcids.length} con texto completo en PMC`)

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

        // Segundo parseo, con preserveOrder:true, SOLO para extracción de
        // texto (ver comentario junto a xmlParserOrdered más arriba).
        const parsedOrdered = xmlParserOrdered.parse(xml)
        const articleSetOrdered = findTag(parsedOrdered, 'pmc-articleset')
        const articleOrdered = (articleSetOrdered ? findTag(articleSetOrdered, 'article') : null)
          ?? findTag(parsedOrdered, 'article')
        if (!articleOrdered) {
          console.log(`   ❌ ${fullPmcid}: XML sin <article> (parseo ordenado)`)
          totalErrors++
          continue
        }

        const meta = extractMeta(articleOrdered)
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

module.exports = {
  extractLicense, extractMeta, chunkArticle, flattenSections,
  xmlParser, xmlParserOrdered, findTag, findAllTags, getAttr, textOfOrdered, normalizeWs,
  // Reusadas por scripts/ingest-msl-literature-deep.js (búsqueda más profunda
  // para UNA patología puntual, sin tocar RETMAX_PER_DISEASE del batch normal)
  // — mismo cliente de Supabase/OpenAI, mismas funciones de red y de embedding,
  // cero lógica duplicada.
  esearchPubmed, elinkPubmedToPmc, efetchPmcFullXml, sleep, getEmbeddings,
  openai, supabase, NCBI_DELAY_MS, EMBED_BATCH, EMBED_DELAY_MS,
}
