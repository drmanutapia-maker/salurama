# HEMA-SALURAMA — Contexto de Sesión
**Usar este archivo en lugar de HEMA_PLAN_2.md al inicio de cada sesión**
**Última actualización: Sesión 7 COMPLETADA**

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
9. El schema `hema` NO está expuesto en la Data API — usar RPCs en schema `public`

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
| 2 | 21 migraciones SQL aplicadas en Supabase | ✅ |
| 3 | hema-shared: types, bsa, ckd-epi, cie10, 81 tests | ✅ |
| 4 | Auth Hook, proxy.ts guard /hema/*, layout HEMA | ✅ |
| 5 | Pacientes: listado, nuevo, perfil, medición, diagnósticos | ✅ |
| 6 | Validador: engine + 7 reglas + 111 tests + Edge Function | ✅ |
| 7 | Seed: 66 protocolos, 57 fármacos, RPCs seed, hema_seed.ts | ✅ |

### ⏳ PENDIENTES
- Sesión 7 resto: UI /hema/admin/protocolos/ + ejecutar pnpm db:hema:seed
- Sesión 8: Order builder wizard 4 pasos
- Sesión 9: Labs + OCR
- Sesión 10: PDF + firma NOM-151
- Sesión 11: Audit log + bitácora
- Sesión 12: Hardening final

## PRÓXIMO PASO INMEDIATO
1. Ejecutar seed: `pnpm db:hema:seed`
2. Verificar: 57 drugs, 66 protocols en Supabase
3. Crear UI /hema/admin/protocolos/

## MIGRACIONES APLICADAS (21 total)
- 20260611000001 a 20260611000016: schema completo + seeds CIE-10
- 20260615000001: RPCs pacientes
- 20260615000002: audit_trigger_function con lookup tenant_id
- 20260615000003: audit patient_diagnoses lookup
- 20260615000004: trigger validación BEFORE INSERT hema.orders
- 20260617000001: RPCs seed (hema_seed_upsert_drug, hema_seed_upsert_protocol, etc.) ✅

## ARCHIVOS CLAVE

### Packages
- packages/hema-shared/src/types.ts — tipos Zod
- packages/hema-shared/src/bsa.ts — BSA Mosteller/DuBois
- packages/hema-shared/src/ckd-epi.ts — TFG CKD-EPI 2021
- packages/hema-shared/src/cie10.ts — búsqueda fuzzy CIE-10
- packages/hema-validator/src/engine.ts + rules/r-*.ts — 111 tests

### App HEMA
- app/hema/layout.tsx, page.tsx
- app/hema/pacientes/page.tsx, nuevo/page.tsx, [id]/page.tsx, [id]/medicion/page.tsx
- app/hema/pacientes/actions.ts

### Supabase
- supabase/functions/hema-auth-hook/ (DESPLEGADA)
- supabase/functions/hema-orders-calculate/ (DESPLEGADA)
- supabase/seed/hema_drugs.json (57 fármacos)
- supabase/seed/hema_protocols.json (66 protocolos, todos active:false)
- supabase/seed/hema_seed.ts (pnpm db:hema:seed)

## DECISIONES ARQUITECTÓNICAS CRÍTICAS
- schema `hema` NO expuesto en Data API → todo via RPCs en public con SECURITY DEFINER
- lib/supabaseClient.ts usa createBrowserClient (sesión en cookies, no localStorage)
- proxy.ts maneja prefijo `base64-` en cookies de Supabase con atob()
- window.location.href en login (NO router.push) — cookies llegan al proxy
- login.tsx lee parámetro `next` (Y `redirect` como fallback)
- protocol_references (NO references — palabra reservada SQL)
- HIERRO-DEXT: 2 protocol_drugs (prueba 25mg seq:1 + completa 500mg seq:2) → R-HIERRO-01
- MATRIX días: RTX d1/d6, MTX d7, AraC d8-9, Tiotepa d10 (reordenados con nota)
- BLIN: 28µg = 0.028mg (dose_unit no soporta µg)
- AZA-VEN total_cycles:12 representativo con nota

## REGLAS CLÍNICAS (hema-validator, 111 tests)
- R-LAB-01: ANC < 1000 → BLOCK
- R-LAB-11: FEVI < 50% → BLOCK antraciclinas
- R-CUM-01: Doxorubicina > 450 mg/m² → BLOCK
- R-DDI-03: Vincristina + CYP3A4 → BLOCK
- R-NEU-01: Bortezomib G2 dolor → warn + 1.0 mg/m²
- R-AGE-01: Vincristina cap 2mg (1.5mg si ≥70a)
- R-PRO-01: APL (C92.4 SOLO) + WBC>10 → require prednisona
- R-HIERRO-01: Dextrano sin dosis prueba → BLOCK

## PROTOCOLOS EN SEED (66 total)
Mieloma C90.0: VRd, VTd, VCD, D-VRd, D-VTd, KRd, Rd-light, DPd
Amiloidosis E85.8: D-VCd
Waldenström C88.0: DRC, BR-W, IBR-W
Hodgkin C81.x: ABVD, AVD, BV-AVD, BEACOPP
LNH B C83.3: R-CHOP-21, R-CHOP-14, POLA-RCHP, DA-EPOCH-R, R-CEOP
Burkitt C83.7: R-CODOX-M, R-IVAC
Folicular C82.9: BR-F, R-CHOP-F, R-CVP, OBI-BENDA, RTX-MANT
Manto C83.1: VR-CAP, BR-MCL
LSNC C85.7/C71.9: MATRIX
LMA C92.x: 7+3, 7+3-MIDO, HiDAC, CPX-351, AZA-VEN, ATRA-ATO, ATO-CONS
LLA C91.0: HCVAD-A, HCVAD-B, BLIN
LMC C92.1: IMA, DASA, NILO, BOSA, PONA
LLC C91.1: ACALA, IBR-R, ZANU, VEN-OBI, FCR
Tricoleucemia C91.4: CLAD, PENTO
MDS D46.x: AZA, DECI, AZA-VEN-MDS, LEN-MDS, LUSPA
MPN D45/D47.x: HU, RUXO, PEG-IFN
Hierro D50.9/D63.0: HIERRO-SAC, HIERRO-CARBX, HIERRO-DEXT, HIERRO-ISO, HIERRO-GLUC

---

## MENSAJE PARA SESIÓN 7 RESTO (UI Admin Protocolos)

```
Lee HEMA_CONTEXTO.md en la raíz del proyecto.
NO leas HEMA_PLAN_2.md.

Sesión 7 — Parte final: UI Admin Protocolos.
El seed YA fue ejecutado (pnpm db:hema:seed corrió exitosamente).

Crea en este orden:

1. Migración nueva con RPCs admin:
   - hema_list_protocols(p_diagnosis_code text DEFAULT NULL, p_active boolean DEFAULT NULL)
   - hema_get_protocol(p_protocol_id uuid)
   - hema_approve_protocol(p_protocol_id uuid) — solo role='director_medico'
   Muéstrame la migración antes de crearla.

2. app/hema/admin/protocolos/page.tsx
   - Lista filtrable por diagnóstico CIE-10 y estado
   - Badge: ACTIVO (verde) / PENDIENTE (amarillo) / INACTIVO (gris)
   - Solo accesible para role='admin' o 'director_medico'
   - Mobile-first 375px

3. app/hema/admin/protocolos/[id]/page.tsx
   - Detalle: nombre, ciclos, fármacos con dosis, diagnósticos vinculados
   - Botón "Aprobar" solo para role='director_medico'
   - Mobile-first, touch targets ≥48px

Lee /mnt/skills/public/frontend-design/SKILL.md antes de la UI.
Sin 'any' TypeScript.
NO despliegues nada sin aprobación explícita.
```

## MENSAJE PARA SESIÓN 8 (Order Builder Wizard)

```
Lee HEMA_CONTEXTO.md en la raíz del proyecto.
NO leas HEMA_PLAN_2.md.

Sesión 8: Order Builder Wizard 4 pasos.
Sesiones 1-7 completadas. Seed ejecutado. 66 protocolos en DB.

El wizard vive en app/hema/indicaciones/nueva/page.tsx
4 pasos:
1. Selección de paciente (buscar por nombre/CURP)
2. Selección de protocolo (filtrado por diagnóstico principal del paciente)
3. Ajuste de dosis (BSA ya calculada, motor valida en tiempo real)
4. Revisión y firma

Datos del paciente de prueba:
- id: 567d2dca-72aa-4187-88c9-2a707ced74f9
- BSA: ~2.01 m² (Mosteller)
- Diagnóstico: C90.0 Mieloma Múltiple
- Protocolo sugerido: VRd (is_preferred:true para C90.0)

CRÍTICO: El validador llama a hema-orders-calculate (Edge Function ya desplegada).
El trigger BEFORE INSERT en hema.orders ya está activo.
Lee /mnt/skills/public/frontend-design/SKILL.md antes de la UI.
Sin 'any' TypeScript. Mobile-first 375px.
NO despliegues nada sin aprobación.
```