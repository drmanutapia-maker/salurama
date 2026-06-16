// hema-orders-calculate — Edge Function
// Acepta JWT de usuario (modules:['hema']) o de service_role (llamada desde trigger Postgres).
// Body: OrderInput (ver packages/hema-shared/src/types.ts)
// Returns: { results: ValidationResult[], hasUnresolvedBlocks: boolean }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Rate limiting (in-memory, por instancia) ─────────────────────────────────
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT   = 30   // requests
const RATE_WINDOW  = 60_000 // ms

function isRateLimited(userId: string): boolean {
  const now     = Date.now()
  const hits    = (rateLimitMap.get(userId) ?? []).filter(t => now - t < RATE_WINDOW)
  hits.push(now)
  rateLimitMap.set(userId, hits)
  return hits.length > RATE_LIMIT
}

// ─── Types (inline — sin Zod para compatibilidad Deno) ────────────────────────

interface OrderInputDrug {
  inn: string
  dose_mg: number
  dose_per_m2: number
  is_anthracycline: boolean
  cyp3a4_substrate: boolean
  cumulative_max_mg_m2?: number
  requires_test_dose?: boolean
  test_dose_completed?: boolean
}

interface OrderInput {
  patient: { weight_kg: number; height_cm: number; bsa_mosteller: number; bsa_dubois: number; age: number; sex: 'M' | 'F'; allergies?: string }
  labs: { anc?: number; platelets?: number; hemoglobin?: number; creatinine?: number; crcl?: number; bilirubin_total?: number; ast?: number; alt?: number; lvef?: number; wbc?: number; collected_at: string }
  protocol: { code: string; drugs: OrderInputDrug[] }
  neuropathy_grade?: 0 | 1 | 2 | 3 | 4
  neuropathy_pain?: boolean
  ecog?: 0 | 1 | 2 | 3 | 4
  concurrent_medications?: string[]
  cumulative_doses?: Record<string, number>
  overrides?: Array<{ rule_id: string; reason: string; override_by: string; co_signed_by?: string }>
  diagnosis_code?: string
  hbv_screened?: boolean
}

interface ValidationResult {
  ruleId: string
  severity: 'block' | 'warn' | 'info'
  message_es: string
  drug_inn?: string
  suggested_dose_mg?: number
  reduction_pct?: number
  override_allowed: boolean
  requires_second_signer: boolean
}

type Rule = { id: string; evaluate(input: OrderInput): ValidationResult | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ULN = 40
const HMA_INNS = new Set(['azacitidina', 'decitabina'])
const STRONG_CYP3A4 = ['claritromicina','itraconazol','ketoconazol','voriconazol','posaconazol','ritonavir','cobicistat','clarithromycin','itraconazole','ketoconazole','voriconazole','posaconazole','nefazodona']
const DVT_PROPHYLAXIS = ['aspirina','heparina','enoxaparina','rivaroxaban','apixaban','warfarina','acenocumarol','fondaparinux','aspirin','heparin','enoxaparin','warfarin']
const LEUCOVORIN = ['leucovorin','folinato','acido folinico','ácido folínico','levoleucovorin']
const MTX_INTERACTORS = ['ibuprofeno','naproxeno','diclofenaco','indometacina','trimetoprima','cotrimoxazol','tmp-smx','sulfametoxazol','amoxicilina','ampicilina','ibuprofen','naproxen','trimethoprim','cotrimoxazole','amoxicillin','ampicillin']
const PJP_PROPHYLAXIS = ['trimetoprima','cotrimoxazol','tmp-smx','pentamidina','atovacuona','trimethoprim','cotrimoxazole','pentamidine','atovaquone']
const CORTICOSTEROIDS = ['prednisona','dexametasona','metilprednisolona','prednisolona','hidrocortisona','prednisone','dexamethasone','methylprednisolone','hydrocortisone']
const ANTI_CD20 = ['rituximab','obinutuzumab','ofatumumab']

function hasMed(meds: string[] | undefined, kws: string[]): boolean {
  if (!meds?.length) return false
  const lower = meds.map(m => m.toLowerCase())
  return kws.some(k => lower.some(m => m.includes(k.toLowerCase())))
}

function getCum(cumDoses: Record<string,number> | undefined, inn: string): number | undefined {
  if (!cumDoses) return undefined
  const k = Object.keys(cumDoses).find(x => x.toLowerCase() === inn.toLowerCase())
  return k !== undefined ? cumDoses[k] : undefined
}

// ─── Rules ────────────────────────────────────────────────────────────────────

const ALL_RULES: Rule[] = [
  // ── BSA ──────────────────────────────────────────────────────────────────
  { id:'R-BSA-01', evaluate(i) { return { ruleId:'R-BSA-01', severity:'info', message_es:`BSA Mosteller ${i.patient.bsa_mosteller.toFixed(2)} m² · DuBois ${i.patient.bsa_dubois.toFixed(2)} m²`, override_allowed:false, requires_second_signer:false } } },
  { id:'R-BSA-02', evaluate(i) { if(i.patient.bsa_mosteller<=2.0)return null; return{ruleId:'R-BSA-02',severity:'warn',message_es:`BSA ${i.patient.bsa_mosteller.toFixed(2)} m² > 2.0. No se aplica cap automático (ASCO 2021).`,override_allowed:true,requires_second_signer:false} } },
  { id:'R-BSA-03', evaluate(i) { const{weight_kg:w,height_cm:h}=i.patient; if(w>=20&&w<=250&&h>=100&&h<=220)return null; return{ruleId:'R-BSA-03',severity:'block',message_es:`Peso ${w} kg / talla ${h} cm fuera de rango fisiológico. Registra nueva medición.`,override_allowed:false,requires_second_signer:false} } },

  // ── LAB ──────────────────────────────────────────────────────────────────
  { id:'R-LAB-01', evaluate(i) { const{anc}=i.labs; if(anc===undefined||anc>=1000)return null; if(i.protocol.drugs.every(d=>HMA_INNS.has(d.inn.toLowerCase())))return null; return{ruleId:'R-LAB-01',severity:'block',message_es:`ANC ${anc}/µL < 1,000/µL. Quimioterapia contraindicada.`,override_allowed:true,requires_second_signer:false} } },
  { id:'R-LAB-02', evaluate(i) { const{platelets:p}=i.labs; if(p===undefined||p>=50_000)return null; if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='bortezomib'||d.is_anthracycline))return null; return{ruleId:'R-LAB-02',severity:'block',message_es:`Plaquetas ${p}/µL < 50,000/µL con bortezomib/antraciclina. Espera recuperación.`,override_allowed:true,requires_second_signer:false} } },
  { id:'R-LAB-03', evaluate(i) { const{platelets:p}=i.labs; if(p===undefined||p>=100_000)return null; if(p<50_000&&i.protocol.drugs.some(d=>d.inn.toLowerCase()==='bortezomib'||d.is_anthracycline))return null; return{ruleId:'R-LAB-03',severity:'warn',message_es:`Plaquetas ${p}/µL < 100,000/µL. Vigila riesgo hemorrágico.`,override_allowed:true,requires_second_signer:false} } },
  { id:'R-LAB-04', evaluate(i) { const{hemoglobin:h}=i.labs; if(h===undefined||h>=8)return null; return{ruleId:'R-LAB-04',severity:'warn',message_es:`Hemoglobina ${h} g/dL < 8 g/dL. Evalúa transfusión.`,override_allowed:true,requires_second_signer:false} } },
  { id:'R-LAB-05', evaluate(i) { const{crcl}=i.labs; if(crcl===undefined||crcl>=30)return null; if(!i.protocol.drugs.some(d=>['bleomicina','lenalidomida'].includes(d.inn.toLowerCase())))return null; return{ruleId:'R-LAB-05',severity:'block',message_es:`CrCl ${crcl.toFixed(0)} mL/min < 30. Bleomicina contraindicada. Lenalidomida → 5 mg/día.`,override_allowed:true,requires_second_signer:false} } },
  { id:'R-LAB-06', evaluate(i) { const{crcl}=i.labs; if(crcl===undefined||crcl<30||crcl>=50)return null; if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='bleomicina'))return null; return{ruleId:'R-LAB-06',severity:'warn',message_es:`CrCl ${crcl.toFixed(0)} mL/min (30–49) + bleomicina. Monitorea PFTs.`,override_allowed:true,requires_second_signer:false} } },
  { id:'R-LAB-07', evaluate(i) { const{bilirubin_total:b}=i.labs; if(b===undefined||b<1.2||b>3.0)return null; if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='doxorubicina'))return null; return{ruleId:'R-LAB-07',severity:'warn',message_es:`Bilirrubina ${b.toFixed(1)} mg/dL (1.2–3.0). Reducir doxorubicina 50%.`,drug_inn:'doxorubicina',reduction_pct:50,override_allowed:true,requires_second_signer:false} } },
  { id:'R-LAB-08', evaluate(i) { const{bilirubin_total:b}=i.labs; if(b===undefined||b<=3.0||b>5.0)return null; if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='doxorubicina'))return null; return{ruleId:'R-LAB-08',severity:'warn',message_es:`Bilirrubina ${b.toFixed(1)} mg/dL (3.1–5.0). Reducir doxorubicina 75%.`,drug_inn:'doxorubicina',reduction_pct:75,override_allowed:true,requires_second_signer:false} } },
  { id:'R-LAB-09', evaluate(i) { const{ast,alt}=i.labs; if(ast===undefined&&alt===undefined)return null; const mx=Math.max(ast??0,alt??0); if(mx<=3*ULN||mx>5*ULN)return null; if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='vincristina'))return null; return{ruleId:'R-LAB-09',severity:'warn',message_es:`AST/ALT ${mx} U/L (> 3×LSN). Reducir vincristina 50%.`,drug_inn:'vincristina',reduction_pct:50,override_allowed:true,requires_second_signer:false} } },
  { id:'R-LAB-10', evaluate(i) { const{ast,alt}=i.labs; if(ast===undefined&&alt===undefined)return null; const mx=Math.max(ast??0,alt??0); if(mx<=5*ULN)return null; if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='vincristina'))return null; return{ruleId:'R-LAB-10',severity:'block',message_es:`AST/ALT ${mx} U/L (> 5×LSN). Vincristina contraindicada.`,drug_inn:'vincristina',override_allowed:true,requires_second_signer:false} } },
  { id:'R-LAB-11', evaluate(i) { const{lvef}=i.labs; if(lvef===undefined||lvef>=50)return null; if(!i.protocol.drugs.some(d=>d.is_anthracycline))return null; return{ruleId:'R-LAB-11',severity:'block',message_es:`FEVI ${lvef}% < 50%. Antraciclinas contraindicadas. Requiere cardiología y segunda firma.`,override_allowed:true,requires_second_signer:true} } },
  { id:'R-LAB-12', evaluate(i) { const days=(Date.now()-new Date(i.labs.collected_at).getTime())/86_400_000; if(days<=30)return null; return{ruleId:'R-LAB-12',severity:'warn',message_es:`Labs con ${Math.floor(days)} días (> 30 días). Solicita laboratorios recientes.`,override_allowed:true,requires_second_signer:false} } },

  // ── CUMULATIVE ────────────────────────────────────────────────────────────
  ...(([
    {id:'R-CUM-01',inn:'doxorubicina',lim:450,cs:true,label:'Doxorubicina'},
    {id:'R-CUM-02',inn:'epirrubicina',lim:900,cs:true,label:'Epirrubicina'},
    {id:'R-CUM-03',inn:'daunorrubicina',lim:550,cs:true,label:'Daunorrubicina'},
    {id:'R-CUM-04',inn:'idarrubicina',lim:150,cs:true,label:'Idarrubicina'},
    {id:'R-CUM-05',inn:'mitoxantrona',lim:140,cs:true,label:'Mitoxantrona'},
    {id:'R-CUM-06',inn:'bleomicina',lim:400,cs:false,label:'Bleomicina'},
  ] as const).map(s => ({
    id: s.id,
    evaluate(i: OrderInput): ValidationResult | null {
      const cum = getCum(i.cumulative_doses, s.inn); if(cum===undefined)return null
      const drug = i.protocol.drugs.find(d=>d.inn.toLowerCase()===s.inn); if(!drug)return null
      const lim = drug.cumulative_max_mg_m2??s.lim; if(cum<=lim)return null
      return{ruleId:s.id,severity:'block',message_es:`${s.label} acumulada ${cum} mg/m² > ${lim} mg/m².${s.cs?' Requiere segunda firma.':''}`,drug_inn:s.inn,override_allowed:true,requires_second_signer:s.cs}
    },
  }) as Rule)),
  { id:'R-CUM-07', evaluate(i) { const c=getCum(i.cumulative_doses,'cisplatino'); if(c===undefined||c<300)return null; if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='cisplatino'))return null; return{ruleId:'R-CUM-07',severity:'warn',message_es:`Cisplatino acumulado ${c} mg/m² ≥ 300 mg/m². Riesgo de nefrotoxicidad/ototoxicidad.`,drug_inn:'cisplatino',override_allowed:true,requires_second_signer:false} } },

  // ── DDI ───────────────────────────────────────────────────────────────────
  { id:'R-DDI-01', evaluate(i) { if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='bortezomib'))return null; if(!hasMed(i.concurrent_medications,STRONG_CYP3A4))return null; return{ruleId:'R-DDI-01',severity:'warn',message_es:'Bortezomib + inhibidor fuerte CYP3A4. Mayor exposición → toxicidad.',drug_inn:'bortezomib',override_allowed:true,requires_second_signer:false} } },
  { id:'R-DDI-02', evaluate(i) { const imid=['lenalidomida','talidomida','pomalidomida']; if(!i.protocol.drugs.some(d=>imid.includes(d.inn.toLowerCase())))return null; if(hasMed(i.concurrent_medications,DVT_PROPHYLAXIS))return null; return{ruleId:'R-DDI-02',severity:'block',message_es:'Inmunomodulador sin profilaxis de TEV. Agrega anticoagulación antes de iniciar.',override_allowed:true,requires_second_signer:false} } },
  { id:'R-DDI-03', evaluate(i) { if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='vincristina'))return null; if(!hasMed(i.concurrent_medications,STRONG_CYP3A4))return null; return{ruleId:'R-DDI-03',severity:'block',message_es:'Vincristina + inhibidor CYP3A4 fuerte. Neurotoxicidad grave. Requiere segunda firma.',drug_inn:'vincristina',override_allowed:true,requires_second_signer:true} } },
  { id:'R-DDI-04', evaluate(i) { if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='ibrutinib'))return null; if(!hasMed(i.concurrent_medications,['warfar','acenocumar']))return null; return{ruleId:'R-DDI-04',severity:'block',message_es:'Ibrutinib + warfarina. Contraindicación absoluta. Cambia a HBPM o ACOD.',drug_inn:'ibrutinib',override_allowed:true,requires_second_signer:false} } },
  { id:'R-DDI-05', evaluate(i) { if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='metotrexato'))return null; if(!hasMed(i.concurrent_medications,MTX_INTERACTORS))return null; return{ruleId:'R-DDI-05',severity:'warn',message_es:'MTX + AINE/TMP-SMX/penicilina. Suspende el interactor antes del MTX.',drug_inn:'metotrexato',override_allowed:true,requires_second_signer:false} } },
  { id:'R-DDI-06', evaluate(i) { const m=i.protocol.drugs.find(d=>d.inn.toLowerCase()==='metotrexato'); if(!m||m.dose_per_m2<1000)return null; if(hasMed(i.concurrent_medications,LEUCOVORIN))return null; return{ruleId:'R-DDI-06',severity:'block',message_es:`MTX ${m.dose_per_m2} mg/m² sin leucovorin. Agrega rescate 24h post-infusión.`,drug_inn:'metotrexato',override_allowed:true,requires_second_signer:false} } },
  { id:'R-DDI-07', evaluate(i) { const purines=['6-mercaptopurina','mercaptopurina','azatioprina']; if(!i.protocol.drugs.some(d=>purines.includes(d.inn.toLowerCase())))return null; if(!hasMed(i.concurrent_medications,['alopurinol','allopurinol']))return null; return{ruleId:'R-DDI-07',severity:'warn',message_es:'Alopurinol + 6-MP/azatioprina. Reduce 6-MP 75% o cambia a rasburicasa.',override_allowed:true,requires_second_signer:false} } },

  // ── NEUROPATHY ────────────────────────────────────────────────────────────
  { id:'R-NEU-01', evaluate(i) {
    if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='bortezomib'))return null
    const g=i.neuropathy_grade??0, pain=i.neuropathy_pain??false
    if(g===0||(g===1&&!pain))return null
    if(g===4)return{ruleId:'R-NEU-01',severity:'block',message_es:'Bortezomib + neuropatía G4. Descontinuar permanentemente.',drug_inn:'bortezomib',override_allowed:false,requires_second_signer:false}
    return{ruleId:'R-NEU-01',severity:'warn',message_es:`Bortezomib + neuropatía G${g}${pain?' con dolor':''}: reducir a 1.0 mg/m² o cambiar a dosificación semanal.`,drug_inn:'bortezomib',suggested_dose_mg:1.0,override_allowed:true,requires_second_signer:false}
  }},
  { id:'R-NEU-02', evaluate(i) {
    if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='vincristina'))return null
    const g=i.neuropathy_grade??0; if(g<2)return null
    if(g===4)return{ruleId:'R-NEU-02',severity:'block',message_es:'Vincristina + neuropatía G4. Descontinuar.',drug_inn:'vincristina',override_allowed:false,requires_second_signer:false}
    if(g===3)return{ruleId:'R-NEU-02',severity:'block',message_es:'Vincristina + neuropatía G3. Suspender hasta G≤1.',drug_inn:'vincristina',override_allowed:true,requires_second_signer:false}
    return{ruleId:'R-NEU-02',severity:'warn',message_es:'Vincristina + neuropatía G2. Reducir 50%.',drug_inn:'vincristina',reduction_pct:50,override_allowed:true,requires_second_signer:false}
  }},
  { id:'R-NEU-03', evaluate(i) {
    if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='talidomida'))return null
    const g=i.neuropathy_grade??0; if(g<2)return null
    return{ruleId:'R-NEU-03',severity:'warn',message_es:`Talidomida + neuropatía G${g}: reducir ${g>=3?'suspender':'50 mg/día'}.`,drug_inn:'talidomida',reduction_pct:g>=3?100:50,override_allowed:true,requires_second_signer:false}
  }},

  // ── AGE ───────────────────────────────────────────────────────────────────
  { id:'R-AGE-01', evaluate(i) {
    const vcr=i.protocol.drugs.find(d=>d.inn.toLowerCase()==='vincristina'); if(!vcr)return null
    const cap=i.patient.age>=70?1.5:2.0; if(vcr.dose_mg<=cap)return null
    return{ruleId:'R-AGE-01',severity:'block',message_es:`VCR ${vcr.dose_mg.toFixed(1)} mg > cap ${cap} mg${i.patient.age>=70?' (≥70 años)':''}.`,drug_inn:'vincristina',suggested_dose_mg:cap,override_allowed:false,requires_second_signer:false}
  }},
  { id:'R-AGE-02', evaluate(i) { if(i.patient.age<75)return null; return{ruleId:'R-AGE-02',severity:'warn',message_es:`Paciente ${i.patient.age} años ≥ 75. Evalúa fragilidad IMWG. Considera Rd-light.`,override_allowed:true,requires_second_signer:false} } },
  { id:'R-AGE-03', evaluate(i) {
    if(i.patient.age<60)return null
    const araC=i.protocol.drugs.find(d=>['citarabina','cytarabine'].includes(d.inn.toLowerCase())&&d.dose_per_m2>=2000)
    if(!araC||araC.dose_per_m2<=1500)return null
    return{ruleId:'R-AGE-03',severity:'warn',message_es:`AraC ${araC.dose_per_m2} mg/m² en paciente ≥60 años. Cap a 1,500 mg/m² c/12h.`,drug_inn:'citarabina',suggested_dose_mg:1500,override_allowed:true,requires_second_signer:false}
  }},

  // ── PROTOCOL ──────────────────────────────────────────────────────────────
  { id:'R-PRO-01', evaluate(i) {
    if(i.diagnosis_code!=='C92.4')return null
    const wbc=i.labs.wbc; if(wbc===undefined||wbc<=10)return null
    if(hasMed(i.concurrent_medications,['prednisona','prednisone','dexametasona','dexamethasone']))return null
    return{ruleId:'R-PRO-01',severity:'block',message_es:`LPA (C92.4) con GB ${wbc}×10⁹/L > 10. Riesgo de síndrome de diferenciación. Agrega prednisona profiláctica.`,override_allowed:true,requires_second_signer:false}
  }},
  { id:'R-PRO-02', evaluate(i) { if(i.diagnosis_code!=='C83.7')return null; if(hasMed(i.concurrent_medications,['rasburicasa','rasburicase']))return null; return{ruleId:'R-PRO-02',severity:'block',message_es:'Burkitt (C83.7) sin rasburicasa. Riesgo de SLT grave. Agrega rasburicasa + hiperhidratación.',override_allowed:true,requires_second_signer:false} } },
  { id:'R-PRO-03', evaluate(i) { if(!i.protocol.drugs.some(d=>ANTI_CD20.includes(d.inn.toLowerCase())))return null; if(i.hbv_screened===true)return null; return{ruleId:'R-PRO-03',severity:'block',message_es:'Anti-CD20 sin serología VHB. Obtén HBsAg + anti-HBc < 90 días.',override_allowed:true,requires_second_signer:false} } },
  { id:'R-PRO-04', evaluate(i) {
    const hasCortico=i.protocol.drugs.some(d=>CORTICOSTEROIDS.some(c=>d.inn.toLowerCase().includes(c)))||hasMed(i.concurrent_medications,CORTICOSTEROIDS)
    if(!hasCortico)return null; if(hasMed(i.concurrent_medications,PJP_PROPHYLAXIS))return null
    return{ruleId:'R-PRO-04',severity:'block',message_es:'Corticosteroide ≥4 sem sin profilaxis PJP. Agrega TMP-SMX.',override_allowed:true,requires_second_signer:false}
  }},
  { id:'R-PRO-05', evaluate(i) { if(!i.protocol.drugs.some(d=>d.inn.toLowerCase()==='daratumumab'))return null; return{ruleId:'R-PRO-05',severity:'warn',message_es:'Daratumumab: verifica SC vs IV y premedicación completa.',drug_inn:'daratumumab',override_allowed:true,requires_second_signer:false} } },
  { id:'R-PRO-06', evaluate(i) { const m=i.protocol.drugs.find(d=>d.inn.toLowerCase()==='metotrexato'); if(!m||m.dose_per_m2<1000)return null; if(hasMed(i.concurrent_medications,LEUCOVORIN))return null; return{ruleId:'R-PRO-06',severity:'block',message_es:`MTX ${m.dose_per_m2} mg/m² sin plan de leucovorin.`,drug_inn:'metotrexato',override_allowed:true,requires_second_signer:false} } },
  { id:'R-HIERRO-01', evaluate(i) {
    const h=i.protocol.drugs.find(d=>d.inn.toLowerCase().includes('dextrano'))
    if(!h||!h.requires_test_dose||h.test_dose_completed===true)return null
    return{ruleId:'R-HIERRO-01',severity:'block',message_es:'Dextrano de hierro sin dosis de prueba (25 mg IV × 15 min + observación). Riesgo anafiláctico.',drug_inn:h.inn,override_allowed:false,requires_second_signer:false}
  }},
]

// ─── Engine ───────────────────────────────────────────────────────────────────

function validateOrder(input: OrderInput): ValidationResult[] {
  const raw: ValidationResult[] = []
  for (const rule of ALL_RULES) {
    const r = rule.evaluate(input)
    if (r) raw.push(r)
  }
  return raw.filter(r => {
    if (!r.override_allowed) return true
    const ov = input.overrides?.find(o => o.rule_id === r.ruleId)
    if (!ov) return true
    if (r.requires_second_signer && !ov.co_signed_by) return true
    return false
  })
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const token      = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  // Verificar JWT — service_role bypasea; usuario necesita modules:['hema']
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const isServiceRole = token === serviceKey

  let userId = 'service_role'
  if (!isServiceRole) {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const modules = (user.user_metadata?.modules ?? []) as string[]
    if (!modules.includes('hema')) {
      return new Response(JSON.stringify({ error: 'Módulo HEMA no activado para este usuario' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    userId = user.id
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  if (isRateLimited(userId)) {
    return new Response(JSON.stringify({ error: 'Rate limit: máximo 30 req/min' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: OrderInput
  try {
    body = await req.json() as OrderInput
    if (!body?.patient || !body?.labs || !body?.protocol?.drugs) {
      throw new Error('OrderInput incompleto')
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido: se requiere OrderInput' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  const results = validateOrder(body)
  const unresolved = results.some(r => r.severity === 'block')

  return new Response(
    JSON.stringify({ results, hasUnresolvedBlocks: unresolved }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
