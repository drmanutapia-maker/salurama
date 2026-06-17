import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

try {
  process.loadEnvFile(resolve(process.cwd(), '.env.local'))
} catch {
  // .env.local no encontrado; asume variables ya exportadas (CI)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno')
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

interface DrugSeed {
  inn: string
  trade_names: string[]
  atc_code: string | null
  is_anthracycline: boolean
  is_vesicant: boolean
  cumulative_max_mg_m2: number | null
  cyp3a4_substrate: boolean
  cyp3a4_strong_inhibitor: boolean
  requires_hbv_screen: boolean
  requires_pft: boolean
  requires_test_dose?: boolean
}

interface ProtocolDiagnosisSeed {
  code: string
  is_preferred: boolean
}

interface ProtocolDrugSeed {
  drug_inn: string
  dose_value: number
  dose_unit: string
  route: string
  days_of_cycle: number[]
  max_dose_mg: number | null
  infusion_minutes: number | null
  vehicle: string | null
  premed_required: Record<string, unknown> | null
  sequence_order: number | null
}

interface ProtocolSeed {
  code: string
  name: string
  cycle_length_days: number
  total_cycles: number | null
  line_of_therapy: string | null
  specialty: string
  active: boolean
  protocol_references: Record<string, unknown> | null
  diagnoses: ProtocolDiagnosisSeed[]
  protocol_drugs: ProtocolDrugSeed[]
}

const counts = {
  drugsUpserted: 0,
  protocolsUpserted: 0,
  diagnosisLinks: 0,
  protocolDrugRows: 0
}

async function seedDrugs(): Promise<Map<string, string>> {
  const file = resolve(process.cwd(), 'supabase/seed/hema_drugs.json')
  const { drugs } = JSON.parse(readFileSync(file, 'utf8')) as { drugs: DrugSeed[] }
  const idByInn = new Map<string, string>()

  for (const drug of drugs) {
    const { data, error } = await supabase.rpc('hema_seed_upsert_drug', {
      p_inn: drug.inn,
      p_trade_names: drug.trade_names,
      p_atc_code: drug.atc_code,
      p_is_anthracycline: drug.is_anthracycline,
      p_is_vesicant: drug.is_vesicant,
      p_cumulative_max_mg_m2: drug.cumulative_max_mg_m2,
      p_cyp3a4_substrate: drug.cyp3a4_substrate,
      p_cyp3a4_strong_inhibitor: drug.cyp3a4_strong_inhibitor,
      p_requires_hbv_screen: drug.requires_hbv_screen,
      p_requires_pft: drug.requires_pft,
      p_requires_test_dose: drug.requires_test_dose ?? false
    })
    if (error) throw new Error(`hema_seed_upsert_drug(${drug.inn}): ${error.message}`)
    idByInn.set(drug.inn, data as string)
    counts.drugsUpserted++
  }
  return idByInn
}

async function seedProtocols(idByInn: Map<string, string>): Promise<void> {
  const file = resolve(process.cwd(), 'supabase/seed/hema_protocols.json')
  const { protocols } = JSON.parse(readFileSync(file, 'utf8')) as { protocols: ProtocolSeed[] }

  for (const protocol of protocols) {
    const { data: protocolId, error: protocolError } = await supabase.rpc('hema_seed_upsert_protocol', {
      p_code: protocol.code,
      p_name: protocol.name,
      p_cycle_length_days: protocol.cycle_length_days,
      p_total_cycles: protocol.total_cycles,
      p_line_of_therapy: protocol.line_of_therapy,
      p_specialty: protocol.specialty,
      p_active: protocol.active,
      p_protocol_references: protocol.protocol_references
    })
    if (protocolError) throw new Error(`hema_seed_upsert_protocol(${protocol.code}): ${protocolError.message}`)
    counts.protocolsUpserted++

    const { data: dxCount, error: dxError } = await supabase.rpc('hema_seed_replace_protocol_diagnoses', {
      p_protocol_id: protocolId,
      p_diagnoses: protocol.diagnoses
    })
    if (dxError) throw new Error(`hema_seed_replace_protocol_diagnoses(${protocol.code}): ${dxError.message}`)
    counts.diagnosisLinks += (dxCount as number) ?? 0

    const drugRows = protocol.protocol_drugs.map((pd) => {
      const drugId = idByInn.get(pd.drug_inn)
      if (!drugId) {
        throw new Error(`drug_inn no encontrado en catálogo: "${pd.drug_inn}" (protocolo ${protocol.code})`)
      }
      return { ...pd, drug_id: drugId }
    })

    const { data: drugCount, error: drugError } = await supabase.rpc('hema_seed_replace_protocol_drugs', {
      p_protocol_id: protocolId,
      p_drugs: drugRows
    })
    if (drugError) throw new Error(`hema_seed_replace_protocol_drugs(${protocol.code}): ${drugError.message}`)
    counts.protocolDrugRows += (drugCount as number) ?? 0
  }
}

async function main(): Promise<void> {
  console.log('Sembrando hema.drugs desde hema_drugs.json...')
  const idByInn = await seedDrugs()

  console.log('Sembrando hema.protocols + protocol_diagnoses + protocol_drugs desde hema_protocols.json...')
  await seedProtocols(idByInn)

  console.log('\n— Resumen de seed —')
  console.log(`Fármacos insertados/actualizados:    ${counts.drugsUpserted}`)
  console.log(`Protocolos insertados/actualizados:  ${counts.protocolsUpserted}`)
  console.log(`Vínculos protocolo↔diagnóstico:       ${counts.diagnosisLinks}`)
  console.log(`Filas protocol_drugs insertadas:      ${counts.protocolDrugRows}`)
}

main().catch((err) => {
  console.error('Seed falló:', err)
  process.exitCode = 1
})
