// Consulta dirigida a ClinicalTrials.gov API v2 — MSL Virtual Componente 2.
//
// Herramienta de INVESTIGACIÓN, no de ingesta automática — mismo espíritu que
// scripts/lookup-fda-label.js (openFDA). Se usa cuando se está curando un
// esquema y hace falta el registro oficial del ensayo pivotal: fases exactas,
// criterios de inclusión/exclusión, brazos de tratamiento con su esquema de
// dosis, y resultados publicados (si el ensayo ya los reportó en el
// registro) — complementa lo que ya trae PMC/openFDA, no lo reemplaza.
//
// Fuente: https://clinicaltrials.gov/api/v2/studies — sin autenticación, sin
// límite de tasa documentado. Datos producidos por NIH/NLM (gobierno de
// EE.UU.) → source_license = 'US-federal-public-domain' para msl_regimens,
// mismo valor que ya se usa para prospectos FDA (ya soportado en el
// constraint de la migración 007, no requiere migración nueva).
//
// OJO: sponsorCollaboratorsModule.leadSponsor es el patrocinador DEL ENSAYO
// clínico (ej. "AbbVie", dato factual del registro) — no tiene relación con
// el campo `sponsor` de msl_documents/msl_regimens, que en este proyecto está
// reservado exclusivamente para acuerdos comerciales aprobados por Manuel.
// Nunca confundir ambos al llenar esa columna.
//
// Uso — tres modos, ninguno elige automáticamente entre varios candidatos:
//
//   node scripts/lookup-clinicaltrials.js --nct=NCT02993523
//     → detalle completo de un ensayo ya identificado por su NCT number.
//
//   node scripts/lookup-clinicaltrials.js --trial="VIALE-A"
//     → busca por nombre/acrónimo del ensayo (query.titles). Lista
//       candidatos rankeados por relevancia; no elige ninguno.
//
//   node scripts/lookup-clinicaltrials.js --drug=venetoclax --condition="acute myeloid leukemia" [--status=COMPLETED]
//     → busca por fármaco (query.intr) + indicación (query.cond), con filtro
//       opcional de estado (--status=). Lista candidatos.
//
// En los modos de listado, vuelve a correr con --nct=<NCT del candidato
// elegido> para ver el detalle completo.

const API_BASE = 'https://clinicaltrials.gov/api/v2/studies'
const SOURCE_LICENSE = 'US-federal-public-domain'
const CANDIDATE_FIELDS = 'NCTId,BriefTitle,Acronym,OverallStatus,Phase,LeadSponsorName'
const CANDIDATE_PAGE_SIZE = 20

function parseArgs(argv) {
  const args = { nct: null, trial: null, drug: null, condition: null, status: null }
  for (const arg of argv) {
    const m = arg.match(/^--(nct|trial|drug|condition|status)=(.*)$/)
    if (m) args[m[1]] = m[2]
  }
  return args
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`ClinicalTrials.gov ${res.status} — ${url}`)
  return res.json()
}

async function fetchStudyByNctId(nctId) {
  return fetchJson(`${API_BASE}/${encodeURIComponent(nctId)}`)
}

async function searchStudies(params, { fields, pageSize } = {}) {
  const qs = new URLSearchParams(params)
  qs.set('countTotal', 'true')
  qs.set('pageSize', String(pageSize ?? CANDIDATE_PAGE_SIZE))
  if (fields) qs.set('fields', fields)
  const url = `${API_BASE}?${qs.toString()}`
  const data = await fetchJson(url)
  return { totalCount: data?.totalCount ?? 0, studies: data?.studies ?? [], url }
}

function candidateSummary(study) {
  const idm = study.protocolSection?.identificationModule ?? {}
  const st = study.protocolSection?.statusModule ?? {}
  const dm = study.protocolSection?.designModule ?? {}
  const sp = study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor ?? {}
  return {
    nctId: idm.nctId,
    acronym: idm.acronym ?? null,
    briefTitle: idm.briefTitle ?? '(sin título)',
    overallStatus: st.overallStatus ?? '(estado desconocido)',
    phases: (dm.phases ?? []).join(', ') || '(fase no especificada)',
    sponsor: sp.name ?? '(patrocinador desconocido)',
  }
}

function printCandidateList(studies, totalCount, { pageSize }) {
  console.log(`⚠️  ${totalCount} candidato(s) encontrado(s)${totalCount > studies.length ? ` — mostrando los primeros ${studies.length}` : ''}. No se elige ninguno automáticamente:\n`)
  studies.forEach((s, i) => {
    const c = candidateSummary(s)
    console.log(`[${i}] ${c.acronym ? c.acronym + ' — ' : ''}${c.briefTitle}`)
    console.log(`    NCT: ${c.nctId} | fase: ${c.phases} | estado: ${c.overallStatus} | patrocinador del ensayo: ${c.sponsor}`)
  })
  if (totalCount > studies.length) {
    console.log(`\n(${totalCount - studies.length} más no mostrados — acota la búsqueda con --status= o revisa si el que buscas ya apareció.)`)
  }
  console.log('\nPara ver el detalle completo de uno: node scripts/lookup-clinicaltrials.js --nct=<NCT_ID>\n')
}

// Extrae el texto plano de un measurement de outcomeMeasuresModule, con su
// intervalo si aplica — misma idea que htmlTableToText en lookup-fda-label.js
// pero para la estructura JSON anidada (no HTML) que usa esta API.
function formatOutcomeMeasure(om, groupTitleById) {
  let out = `\n${om.type ?? '?'} — ${om.title ?? '(sin título)'}\n`
  if (om.description) out += `${om.description}\n`
  if (om.timeFrame) out += `Ventana de tiempo: ${om.timeFrame}\n`
  const unit = [om.paramType, om.unitOfMeasure].filter(Boolean).join(' en ')
  if (unit) out += `Medida: ${unit}\n`

  if (om.reportingStatus && om.reportingStatus !== 'POSTED') {
    out += `(${om.reportingStatus} — sin datos numéricos posteados en el registro para esta medida)\n`
    return out
  }

  const denomByGroup = {}
  for (const d of om.denoms ?? []) {
    for (const c of d.counts ?? []) denomByGroup[c.groupId] = `${c.value} ${d.units ?? ''}`.trim()
  }

  out += 'Grupos:\n'
  for (const g of om.groups ?? []) {
    const n = denomByGroup[g.id] ? ` (n=${denomByGroup[g.id]})` : ''
    out += `  [${g.id}] ${g.title}${n}\n`
    if (g.description) out += `      ${g.description}\n`
  }

  out += 'Resultados:\n'
  for (const cls of om.classes ?? []) {
    for (const cat of cls.categories ?? []) {
      if (cat.title) out += `  ${cat.title}:\n`
      for (const m of cat.measurements ?? []) {
        const range = m.lowerLimit || m.upperLimit ? ` [${m.lowerLimit ?? '?'}–${m.upperLimit ?? '?'}]` : ''
        out += `    ${groupTitleById[m.groupId] ?? m.groupId}: ${m.value}${range}\n`
      }
    }
  }

  if ((om.analyses ?? []).length > 0) {
    out += 'Análisis estadístico:\n'
    for (const a of om.analyses) {
      const groups = (a.groupIds ?? []).map(id => groupTitleById[id] ?? id).join(' vs. ')
      const p = a.pValue ? `p=${a.pValue}` : '(sin p-value)'
      out += `  ${groups}: ${p}${a.pValueComment ? ' — ' + a.pValueComment : ''}\n`
    }
  }

  return out
}

function printStudyDetail(study) {
  const ps = study.protocolSection
  const idm = ps.identificationModule ?? {}
  const st = ps.statusModule ?? {}
  const dm = ps.designModule ?? {}
  const em = ps.eligibilityModule ?? {}
  const aim = ps.armsInterventionsModule ?? {}
  const om = ps.outcomesModule ?? {}
  const sp = ps.sponsorCollaboratorsModule?.leadSponsor ?? {}

  console.log('=== ENSAYO CLINICALTRIALS.GOV ===')
  console.log(`NCT ID: ${idm.nctId}`)
  console.log(`Acrónimo: ${idm.acronym ?? '(sin acrónimo)'}`)
  console.log(`Título breve: ${idm.briefTitle}`)
  console.log(`Título oficial: ${idm.officialTitle ?? '(sin título oficial)'}`)
  console.log(`Fase: ${(dm.phases ?? []).join(', ') || '(no especificada)'}`)
  console.log(`Tipo de estudio: ${dm.studyType ?? '(desconocido)'}`)
  console.log(`Estado: ${st.overallStatus ?? '(desconocido)'}`)
  console.log(`Inscripción: ${dm.enrollmentInfo?.count ?? '?'} (${dm.enrollmentInfo?.type ?? '?'})`)
  console.log(`Patrocinador DEL ENSAYO: ${sp.name ?? '(desconocido)'} (${sp.class ?? '?'}) — no confundir con el campo "sponsor" de msl_regimens`)
  console.log(`source_license (para msl_regimens): ${SOURCE_LICENSE}`)
  console.log(`Fuente: https://clinicaltrials.gov/study/${idm.nctId}`)

  console.log('\n=== ELIGIBILITY CRITERIA (texto completo) ===')
  if (em.minimumAge || em.maximumAge) console.log(`Edad: ${em.minimumAge ?? '?'} – ${em.maximumAge ?? '?'} | Sexo: ${em.sex ?? '?'}`)
  console.log(em.eligibilityCriteria ?? '(sin criterios de elegibilidad)')

  console.log('\n=== BRAZOS E INTERVENCIONES ===')
  for (const arm of aim.armGroups ?? []) {
    console.log(`\n[${arm.type ?? '?'}] ${arm.label}`)
    if (arm.description) console.log(`  ${arm.description}`)
  }
  for (const iv of aim.interventions ?? []) {
    console.log(`\n${iv.type ?? '?'}: ${iv.name}`)
    if (iv.description) console.log(`  ${iv.description}`)
    if (iv.armGroupLabels?.length) console.log(`  Brazos: ${iv.armGroupLabels.join(', ')}`)
  }

  console.log('\n=== OUTCOMES DEFINIDOS EN PROTOCOLO ===')
  for (const o of [...(om.primaryOutcomes ?? []), ...(om.secondaryOutcomes ?? [])]) {
    console.log(`\n[${om.primaryOutcomes?.includes(o) ? 'PRIMARY' : 'SECONDARY'}] ${o.measure}`)
    if (o.description) console.log(`  ${o.description}`)
    if (o.timeFrame) console.log(`  Ventana de tiempo: ${o.timeFrame}`)
  }

  console.log('\n=== RESULTADOS PUBLICADOS ===')
  if (!study.hasResults) {
    console.log('Sin resultados publicados en el registro (hasResults: false).')
  } else {
    const outcomeMeasures = study.resultsSection?.outcomeMeasuresModule?.outcomeMeasures ?? []
    for (const measure of outcomeMeasures) {
      const groupTitleById = {}
      for (const g of measure.groups ?? []) groupTitleById[g.id] = g.title
      console.log(formatOutcomeMeasure(measure, groupTitleById))
    }
    console.log(`(Solo se muestran las medidas de resultado — eventos adversos y flujo de participantes no se renderizan aquí. Detalle completo: https://clinicaltrials.gov/study/${idm.nctId}?tab=results)`)
  }

  const fullText = [
    em.eligibilityCriteria,
    ...(aim.interventions ?? []).map(iv => iv.description),
    ...[...(om.primaryOutcomes ?? []), ...(om.secondaryOutcomes ?? [])].map(o => o.description),
  ].filter(Boolean).join('\n\n')

  console.log('\n' + '─'.repeat(50))
  console.log('Recordatorio: cualquier excerpt que se use para msl_regimens.source_excerpt')
  console.log('debe verificarse como substring EXACTO del texto fuente (eligibilityCriteria,')
  console.log('descripciones de intervenciones y de outcomes) antes de presentarlo para')
  console.log('revisión — usar verifyExcerpt(fullText, excerpt) exportado por este módulo.')
  console.log('─'.repeat(50) + '\n')

  return fullText
}

function verifyExcerpt(fullText, excerpt) {
  return typeof excerpt === 'string' && excerpt.length > 0 && fullText.includes(excerpt)
}

async function main() {
  const { nct, trial, drug, condition, status } = parseArgs(process.argv.slice(2))

  if (nct) {
    console.log(`\n🔍  ClinicalTrials.gov — lookup directo: ${nct}\n`)
    const study = await fetchStudyByNctId(nct)
    if (!study) {
      console.log(`❌ No se encontró ningún ensayo con NCT ID "${nct}".\n`)
      return
    }
    printStudyDetail(study)
    return
  }

  if (trial) {
    console.log(`\n🔍  ClinicalTrials.gov — búsqueda por nombre/acrónimo: "${trial}"\n`)
    const { totalCount, studies } = await searchStudies({ 'query.titles': trial }, { fields: CANDIDATE_FIELDS })
    if (totalCount === 0) {
      console.log('❌ No se encontraron ensayos con ese nombre o acrónimo.\n')
      return
    }
    printCandidateList(studies, totalCount, { pageSize: CANDIDATE_PAGE_SIZE })
    return
  }

  if (drug || condition) {
    const label = [drug && `fármaco="${drug}"`, condition && `indicación="${condition}"`, status && `estado=${status}`].filter(Boolean).join(', ')
    console.log(`\n🔍  ClinicalTrials.gov — búsqueda por ${label}\n`)
    const params = {}
    if (drug) params['query.intr'] = drug
    if (condition) params['query.cond'] = condition
    if (status) params['filter.overallStatus'] = status
    const { totalCount, studies } = await searchStudies(params, { fields: CANDIDATE_FIELDS })
    if (totalCount === 0) {
      console.log('❌ No se encontraron ensayos con esos criterios.\n')
      return
    }
    printCandidateList(studies, totalCount, { pageSize: CANDIDATE_PAGE_SIZE })
    return
  }

  console.error('Uso:')
  console.error('  node scripts/lookup-clinicaltrials.js --nct=<NCT_ID>')
  console.error('  node scripts/lookup-clinicaltrials.js --trial=<nombre_o_acronimo>')
  console.error('  node scripts/lookup-clinicaltrials.js --drug=<farmaco> --condition=<indicacion> [--status=<OverallStatus>]')
  process.exit(1)
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error fatal:', err)
    process.exit(1)
  })
}

module.exports = { fetchStudyByNctId, searchStudies, candidateSummary, formatOutcomeMeasure, verifyExcerpt }
