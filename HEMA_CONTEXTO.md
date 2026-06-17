# HEMA-SALURAMA — Contexto de Sesión
**Usar este archivo en lugar de HEMA_PLAN_2.md al inicio de cada sesión**

---

## PROYECTO
Módulo clínico de indicaciones de quimioterapia integrado en salurama.com
Stack: Next.js 16.2.9 (proxy.ts NO middleware.ts) + Supabase + TypeScript

## REGLAS ABSOLUTAS
1. NO modificar archivos existentes sin mostrar el cambio primero
2. NO desplegar Edge Functions sin aprobación explícita
3. Sin `any` en TypeScript
4. Mínimo 3 tests por función clínica
5. Mobile-first 375px, touch targets ≥48px
6. NO tocar schema `public` de Supabase (es de Salurama)
7. Todo lo nuevo vive en schema `hema`
8. Si el archivo a crear es muy grande, dividirlo en partes

## STACK TÉCNICO
- Frontend: Next.js 16.2.9 App Router, TypeScript, Tailwind, shadcn/ui
- Routing: proxy.ts (NO middleware.ts) — Next.js 16 usa proxy
- Auth: Supabase Auth + createBrowserClient (@supabase/ssr) en lib/supabaseClient.ts
- DB: Supabase Postgres schema `hema` con RLS
- Monorepo: pnpm workspaces
- Packages: @salurama/hema-shared, @salurama/hema-validator, @salurama/hema-pdf

## DATOS DE PRODUCCIÓN
- Supabase project ref: pwcdwxhfypaxvtqydzcg
- Tenant de prueba: CMN La Raza
  id: a6f9ca57-be48-4e9e-8423-95f5c9bdd81d
- Paciente de prueba: Manuel Augusto Tapia Dávila
  id: 567d2dca-72aa-4187-88c9-2a707ced74f9
  diagnóstico principal: C90.0 Mieloma Múltiple
- Usuario médico:
  auth.users.id: 61e71b89-6e13-4721-821a-96e6307867e9
  doctor_id (public.doctors): 5fd15462-e0c6-476b-a9b7-c80575f611a2
  hema.users.id: 61e71b89-6e13-4721-821a-96e6307867e9
  role: medico

## ESTADO DE SESIONES

### ✅ COMPLETADAS
| Sesión | Entregable | Estado |
|--------|-----------|--------|
| 1 | Monorepo pnpm, shadcn/ui, 3 packages hema-* | ✅ |
| 2 | 20 migraciones SQL aplicadas en Supabase | ✅ |
| 3 | hema-shared: types, bsa, ckd-epi, cie10, 81 tests | ✅ |
| 4 | Auth Hook, proxy.ts guard /hema/*, layout HEMA | ✅ |
| 5 | Pacientes: listado, nuevo, perfil, medición, diagnósticos | ✅ |
| 6 | Validador: engine + 7 reglas + 111 tests + Edge Function | ✅ |

### 🔄 EN PROGRESO
| Sesión | Estado parcial |
|--------|---------------|
| 7 | supabase/seed/hema_drugs.json creado. hema_protocols.json PENDIENTE |

### ⏳ PENDIENTES
- Sesión 8: Order builder wizard 4 pasos
- Sesión 9: Labs + OCR
- Sesión 10: PDF + firma NOM-151
- Sesión 11: Audit log + bitácora
- Sesión 12: Hardening final

## ARCHIVOS CLAVE CREADOS

### Packages
- packages/hema-shared/src/types.ts — tipos Zod
- packages/hema-shared/src/bsa.ts — BSA Mosteller/DuBois
- packages/hema-shared/src/ckd-epi.ts — TFG CKD-EPI 2021
- packages/hema-shared/src/cie10.ts — búsqueda fuzzy CIE-10
- packages/hema-validator/src/engine.ts — orchestrador reglas
- packages/hema-validator/src/rules/r-bsa.ts — R-BSA-01 a 03
- packages/hema-validator/src/rules/r-lab.ts — R-LAB-01 a 12
- packages/hema-validator/src/rules/r-cumulative.ts — R-CUM-01 a 07
- packages/hema-validator/src/rules/r-ddi.ts — R-DDI-01 a 07
- packages/hema-validator/src/rules/r-neuropathy.ts — R-NEU-01 a 03
- packages/hema-validator/src/rules/r-age.ts — R-AGE-01 a 03
- packages/hema-validator/src/rules/r-protocol.ts — R-PRO-01 a 06

### App HEMA
- app/hema/layout.tsx — guard claim modules:['hema']
- app/hema/page.tsx — dashboard mobile-first
- app/hema/pacientes/page.tsx — listado pacientes
- app/hema/pacientes/nuevo/page.tsx — registro con CURP
- app/hema/pacientes/[id]/page.tsx — perfil + diagnósticos
- app/hema/pacientes/[id]/medicion/page.tsx — nueva medición + BSA
- app/hema/pacientes/actions.ts — Server Actions

### Supabase
- supabase/functions/hema-auth-hook/ — JWT con modules + tenant_id
- supabase/functions/hema-orders-calculate/ — validador clínico (DESPLEGADA)
- supabase/seed/hema_drugs.json — catálogo fármacos

## SCHEMA HEMA (tablas en Supabase)
tenants, users, patients, patient_measurements, patient_diagnoses,
diagnoses, protocols, protocol_diagnoses, protocol_drugs, drugs,
lab_panels, lab_values, orders, order_drugs, cumulative_doses,
audit_log, audit_anchors, signatures

## CAMPO IMPORTANTE
- En hema.protocols el campo se llama `protocol_references` (NO `references`)
  — fue renombrado porque `references` es palabra reservada SQL

## REGLAS CLÍNICAS ACTIVAS (hema-validator)
- R-BSA-01/02/03: Mosteller default, no auto-cap a 2.0m²
- R-LAB-01: ANC < 1000 → BLOCK
- R-LAB-02: Plaquetas < 50,000 → BLOCK
- R-LAB-05: CrCl < 30 → BLOCK bleomicina, ajuste lenalidomida
- R-LAB-11: FEVI < 50% → BLOCK antraciclinas
- R-CUM-01: Doxorubicina > 450 mg/m² → BLOCK
- R-DDI-03: Vincristina + CYP3A4 → BLOCK
- R-NEU-01: Bortezomib G2 dolor → warn + 1.0 mg/m²
- R-AGE-01: Vincristina cap 2mg (1.5mg si ≥70a)
- R-PRO-01: APL (C92.4 SOLO) + WBC>10 → require prednisona
- R-HIERRO-01: Dextrano sin dosis prueba → BLOCK

## PROTOCOLOS PRIORITARIOS (Sesión 7)
Seed en supabase/seed/hema_protocols.json — crear por grupos:

Grupo 1 — Mieloma (C90.0):
VRd, VTd, VCD/CyBorD, D-VRd, D-VTd, KRd, Rd-light, DPd

Grupo 2 — Amiloidosis (E85.81) + Waldenström (C88.0):
D-VCd, DRC, BR-W, IBR-W

Grupo 3 — Hodgkin (C81.x):
ABVD, AVD, BV-AVD, BEACOPP

Grupo 4 — LNH Agresivo B (C83.3):
R-CHOP-21, R-CHOP-14, POLA-RCHP, DA-EPOCH-R, R-CEOP

Grupo 5 — Burkitt + Folicular + Manto:
R-CODOX-M, R-IVAC, BR-F, R-CVP, OBI-BENDA, RTX-MANT, VR-CAP

Grupo 6 — LSNC + LMA:
MATRIX, 7+3, 7+3-MIDO, HIDAC, CPX-351, AZA-VEN, ATRA-ATO, ATO-CONS

Grupo 7 — LLA + LMC + LLC:
HCVAD-A, HCVAD-B, BLIN, IMA, DASA, NILO, BOSA, PONA,
ACALA, IBR-R, ZANU, VEN-OBI, FCR

Grupo 8 — Tricoleucemia + MDS + MPN + Hierro:
CLAD, PENTO, AZA, DECI, AZA-VEN-MDS, LEN-MDS, LUSPA,
HU, RUXO, PEG-IFN,
HIERRO-SAC, HIERRO-CARBX, HIERRO-DEXT, HIERRO-ISO, HIERRO-GLUC

## FORMATO DEL JSON DE PROTOCOLOS
Cada protocolo en hema_protocols.json debe tener:
{
  "code": "VRD",
  "name": "Bortezomib-Lenalidomida-Dexametasona",
  "cycle_length_days": 21,
  "total_cycles": 8,
  "line_of_therapy": "1L",
  "specialty": "hematologia",
  "active": false,
  "protocol_references": {"guideline": "NCCN 2024", "trial": "SWOG S0777"},
  "diagnoses": ["C90.0"],
  "is_preferred": true,
  "drugs": [
    {
      "drug_inn": "bortezomib",
      "dose_value": 1.3,
      "dose_unit": "mg/m2",
      "route": "SC",
      "days_of_cycle": [1,4,8,11],
      "max_dose_mg": null,
      "infusion_minutes": 5,
      "vehicle": null,
      "sequence_order": 1
    }
  ]
}

## INSTRUCCIONES PARA SIGUIENTE SESIÓN
Al iniciar una nueva sesión en Claude Code, pega:

"Lee HEMA_CONTEXTO.md en la raíz del proyecto.
NO leas HEMA_PLAN_2.md — usa solo el contexto.
Ejecuta la Sesión [NÚMERO] descrita abajo: [instrucciones específicas]"