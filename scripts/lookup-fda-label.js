// Consulta dirigida a openFDA (drug/label) — MSL Virtual Componente 2.
//
// Herramienta de INVESTIGACIÓN, no de ingesta automática. Se usa cuando se
// está curando un esquema específico y falta el protocolo de dosificación
// exacto (ej. escalamiento/titulación) que un review no detalla — mismo caso
// que motivó agregar esto: el ramp-up de venetoclax en LMA, encontrado hoy a
// mano en el PDF de accessdata.fda.gov. Este script automatiza el paso de
// "buscar y extraer la sección de dosificación", pero la elección del
// excerpt final, su verificación como substring exacto, y la inserción en
// msl_regimens siguen siendo pasos manuales — igual que hoy.
//
// Uso:
//   node scripts/lookup-fda-label.js <nombre_generico>
//     → si hay 1 solo resultado, muestra su dosage_and_administration completo
//     → si hay varios (común en genéricos), SOLO lista los candidatos —
//       no elige ninguno por su cuenta.
//   node scripts/lookup-fda-label.js <nombre_generico> --set-id=<set_id>
//     → muestra el label específico elegido de la lista anterior.
//
// Fuente: https://api.fda.gov/drug/label.json — sin autenticación, gratis
// (240 req/min, 1000/día por IP, de sobra para uso dirigido). Licencia CC0
// 1.0 declarada explícitamente por openFDA (open.fda.gov/license) — no
// 'US-federal-public-domain' (ese valor es para casos sin declaración de
// licencia tan explícita, como un PDF descargado directo de accessdata.fda.gov
// sin una página de licencia dedicada).

const OPENFDA_BASE = 'https://api.fda.gov/drug/label.json'
const SOURCE_LICENSE = 'CC0'

function parseArgs(argv) {
  const [genericName, ...rest] = argv
  let setId = null
  for (const arg of rest) {
    const m = arg.match(/^--set-id=(.+)$/)
    if (m) setId = m[1]
  }
  return { genericName, setId }
}

async function searchByGenericName(genericName) {
  const url = `${OPENFDA_BASE}?search=${encodeURIComponent(`openfda.generic_name:"${genericName}"`)}&limit=99`
  const res = await fetch(url)
  if (res.status === 404) return { total: 0, results: [] } // openFDA devuelve 404 cuando no hay resultados
  if (!res.ok) throw new Error(`openFDA ${res.status} — ${url}`)
  const data = await res.json()
  return { total: data.meta.results.total, results: data.results ?? [] }
}

function candidateSummary(r) {
  return {
    set_id: r.set_id,
    brand_name: r.openfda?.brand_name?.join(', ') ?? '(sin marca)',
    manufacturer_name: r.openfda?.manufacturer_name?.join(', ') ?? '(fabricante desconocido)',
    effective_time: r.effective_time ?? '(sin fecha)',
    route: r.openfda?.route?.join(', ') ?? null,
  }
}

// Convierte una tabla SPL en HTML (formato openFDA) a filas de texto legibles.
function htmlTableToText(tableHtml) {
  const captionMatch = tableHtml.match(/<caption>([\s\S]*?)<\/caption>/)
  const caption = captionMatch ? captionMatch[1].replace(/<[^>]+>/g, '').trim() : '(sin caption)'

  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(trMatch => {
    const cells = [...trMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
    return cells.map(c => c[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  })

  let out = `\n${caption}\n${'-'.repeat(caption.length)}\n`
  for (const row of rows) out += row.join(' | ') + '\n'
  return out
}

// Verificación de substring exacto — mismo mecanismo que
// scripts/extract-msl-regimens.js usa para PMC. Un excerpt propuesto para
// msl_regimens.source_excerpt SOLO es válido si es substring literal del
// texto completo devuelto por openFDA (dosage_and_administration.join('\n\n')
// concatenado con el texto de las tablas vía htmlTableToText) — nunca una
// paráfrasis, sin importar qué tan segura parezca.
function verifyExcerpt(fullText, excerpt) {
  return typeof excerpt === 'string' && excerpt.length > 0 && fullText.includes(excerpt)
}

async function main() {
  const { genericName, setId } = parseArgs(process.argv.slice(2))

  if (!genericName) {
    console.error('Uso: node scripts/lookup-fda-label.js <nombre_generico> [--set-id=<set_id>]')
    process.exit(1)
  }

  console.log(`\n🔍  openFDA drug/label — búsqueda: "${genericName}"\n`)

  const { total, results } = await searchByGenericName(genericName)

  if (total === 0) {
    console.log('❌ No se encontraron labels en openFDA para este nombre genérico.')
    console.log('   (Puede que el nombre no coincida exactamente con openfda.generic_name — probar variantes.)\n')
    return
  }

  let chosen
  if (setId) {
    chosen = results.find(r => r.set_id === setId)
    if (!chosen) {
      console.log(`❌ No se encontró un resultado con set_id="${setId}" entre los ${total} candidatos.\n`)
      return
    }
  } else if (total === 1) {
    chosen = results[0]
    console.log('✅ Un solo resultado — se usa directamente.\n')
  } else {
    console.log(`⚠️  ${total} candidatos encontrados — no se elige ninguno automáticamente. Revisa la lista y vuelve a correr con --set-id=<set_id> del que corresponda:\n`)
    results.forEach((r, i) => {
      const c = candidateSummary(r)
      console.log(`[${i}] ${c.brand_name} — ${c.manufacturer_name}`)
      console.log(`    set_id: ${c.set_id} | vigencia (effective_time): ${c.effective_time}${c.route ? ' | vía: ' + c.route : ''}`)
    })
    console.log('')
    return
  }

  const c = candidateSummary(chosen)
  console.log('=== LABEL ELEGIDO ===')
  console.log(`Marca: ${c.brand_name}`)
  console.log(`Fabricante: ${c.manufacturer_name}`)
  console.log(`set_id: ${c.set_id}`)
  console.log(`effective_time: ${c.effective_time}`)
  console.log(`source_license (para msl_regimens): ${SOURCE_LICENSE}`)
  console.log(`Fuente: https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${genericName}"`)
  console.log('')

  const fullText = (chosen.dosage_and_administration ?? []).join('\n\n')
  const tables = chosen.dosage_and_administration_table ?? []

  console.log('=== DOSAGE AND ADMINISTRATION (texto completo) ===\n')
  console.log(fullText || '(sin contenido en dosage_and_administration)')

  if (tables.length > 0) {
    console.log('\n=== TABLAS ===')
    for (const t of tables) console.log(htmlTableToText(t))
  }

  console.log('\n─'.repeat(50))
  console.log('Recordatorio: cualquier excerpt que se use para msl_regimens.source_excerpt')
  console.log('debe verificarse como substring EXACTO de este texto (fullText de arriba,')
  console.log('unido con el texto de las tablas) antes de presentarlo para revisión —')
  console.log('usar verifyExcerpt(fullText, excerpt) exportado por este módulo.')
  console.log('─'.repeat(50) + '\n')
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error fatal:', err)
    process.exit(1)
  })
}

module.exports = { searchByGenericName, candidateSummary, htmlTableToText, verifyExcerpt }
