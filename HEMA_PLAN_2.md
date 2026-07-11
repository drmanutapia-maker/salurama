# HEMA-SALURAMA — Contexto de Sesión
**Usar este archivo en lugar de HEMA_PLAN_2.md al inicio de cada sesión**
**Última actualización: Sesión 9 COMPLETADA**

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
10. NO ejecutar tsc ni typecheck — consume demasiada memoria en este equipo

## STACK TÉCNICO
- Frontend: Next.js 16.2.9 App Router, TypeScript, Tailwind, shadcn/ui
- Routing: proxy.ts (NO middleware.ts) — Next.js 16 usa proxy
- Auth: Supabase Auth + createBrowserClient (@supabase/ssr) en lib/supabaseClient.ts
- DB: Supabase Postgres schema `hema` con RLS
- Monorepo: pnpm workspaces
- Packages: @salurama/hema-shared, @salurama/hema-validator, @salurama/hema-pdf

## DATOS DE PRODUCCIÓN
- Supabase project ref: pwcdwxhfypaxvtqydzcg
- Tenant CMN La Raza: a6f9ca57-be48-4e9e-8423-95f5c9bdd81d
- Paciente prueba Manuel Tapia:
  id: 567d2dca-72aa-4187-88c9-2a707ced74f9
  diagnóstico principal: C90.0 Mieloma Múltiple
  BSA: ~1.93 m² (Mosteller)
- Usuario médico:
  auth.users.id: 61e71b89-6e13-4721-821a-96e6307867e9
  doctor_id: 5fd15462-e0c6-476b-a9b7-c80575f611a2
  hema.users.id: 61e71b89-6e13-4721-821a-96e6307867e9
  role: medico

## ESTADO DE SESIONES

### ✅ COMPLETADAS (1-9)
| Sesión | Entregable |
|--------|-----------|
| 1 | Monorepo pnpm, shadcn/ui, packages hema-* |
| 2 | 23 migraciones SQL en Supabase |
| 3 | hema-shared: BSA, CKD-EPI, CIE-10, 81 tests |
| 4 | Auth Hook, proxy.ts, layout HEMA |
| 5 | Módulo pacientes completo |
| 6 | Motor validación: 111 tests, Edge Function |
| 7 | Seed: 66 protocolos, 57 fármacos |
| 8 | Wizard indicaciones 4 pasos funcionando |
| 9 | Módulo labs: captura manual, OCR placeholder, pre-llenado wizard |

### ⏳ PENDIENTES
- Sesión 10: PDF NOM-004 + firma NOM-151 (Mifiel) + OCR labs
- Sesión 11: Audit log + bitácora inmutable
- Sesión 12: Hardening final + separación UI admin/clínica

## MIGRACIONES APLICADAS (23 total)
- 20260611000001 a 20260611000016: schema completo + seeds
- 20260615000001: RPCs pacientes
- 20260615000002: audit_trigger_function con lookup tenant_id
- 20260615000003: audit patient_diagnoses lookup
- 20260615000004: trigger validación BEFORE INSERT hema.orders
- 20260617000001: RPCs seed (hema_seed_upsert_drug, etc.)
- 20260617000002: RPCs admin protocolos + rol director_medico
- 20260617000003: hema_get_protocol ampliada + hema_create_order
- 20260618000001: fix trigger pg_net (body sin cast ::text)
- 20260618000002: RPCs labs (hema_create_lab_panel, hema_add_lab_value, hema_get_lab_panels)
- 20260618000003: hema_list_recent_lab_panels

## ARCHIVOS CLAVE

### Packages
- packages/hema-shared/src/types.ts — tipos Zod
- packages/hema-shared/src/bsa.ts — BSA Mosteller/DuBois
- packages/hema-shared/src/ckd-epi.ts — TFG CKD-EPI 2021
- packages/hema-shared/src/cie10.ts — búsqueda fuzzy CIE-10
- packages/hema-shared/src/lab-params.ts — catálogo parámetros lab
- packages/hema-validator/src/engine.ts + rules/r-*.ts — 111 tests

### App HEMA
- app/hema/layout.tsx, page.tsx
- app/hema/pacientes/page.tsx, nuevo/page.tsx, [id]/page.tsx, [id]/medicion/page.tsx
- app/hema/pacientes/actions.ts
- app/hema/ordenes/nueva/ — wizard 4 pasos completo
  - types.ts, calc.ts, actions.ts
  - Step1Patient.tsx, Step2Protocol.tsx, Step3Dose.tsx
  - Step3ClinicalInputs.tsx, Step3DrugList.tsx, Step4Review.tsx
  - page.tsx (con deep-link ?patient=<id>)
- app/hema/labs/page.tsx — listado institucional
- app/hema/labs/nuevo/page.tsx — captura manual + OCR placeholder
- app/hema/labs/actions.ts
- app/hema/admin/protocolos/page.tsx, [id]/page.tsx
- components/hema/HemaNav.tsx — navegación HEMA
- components/hema/BsaCard.tsx
- components/hema/LabsSummaryCard.tsx
- components/hema/ResultItem.tsx

### Supabase
- supabase/functions/hema-auth-hook/ (DESPLEGADA)
- supabase/functions/hema-orders-calculate/ (DESPLEGADA, fix decodeJwtPayload)
- supabase/seed/hema_drugs.json (57 fármacos)
- supabase/seed/hema_protocols.json (66 protocolos)
- supabase/seed/hema_seed.ts

## DECISIONES ARQUITECTÓNICAS CRÍTICAS
- proxy.ts (NO middleware.ts) — Next.js 16 usa proxy
- createBrowserClient (NO createClient) — sesión en cookies
- window.location.href en login (NO router.push)
- proxy.ts maneja prefijo base64- en cookies con atob()
- schema hema NO expuesto en Data API → RPCs en public
- protocol_references (NO references — SQL reservada)
- modules viene del JWT decodificado (NO user_metadata)
- router.refresh() después de router.push() para invalidar cache
- PostgREST retorna objeto singular en relaciones FK muchos-a-uno (NO array)

## REGLAS CLÍNICAS (hema-validator, 111 tests)
- R-LAB-01: ANC < 1000 → BLOCK
- R-LAB-11: FEVI < 50% → BLOCK antraciclinas
- R-CUM-01: Doxorubicina > 450 mg/m² → BLOCK
- R-DDI-02: Inmunomodulador sin profilaxis TEV → BLOCK
- R-DDI-03: Vincristina + CYP3A4 → BLOCK
- R-NEU-01: Bortezomib G2 dolor → warn + 1.0 mg/m²
- R-AGE-01: Vincristina cap 2mg (1.5mg si ≥70a)
- R-PRO-01: APL (C92.4 SOLO) → require prednisona
- R-PRO-04: Corticosteroide ≥4 sem sin profilaxis PJP → BLOCK
- R-HIERRO-01: Dextrano sin dosis prueba → BLOCK

## ORDEN CREADA (prueba)
- ID: 877fd097-c615-41a5-93d6-8bf39bcf947a
- Protocolo: VRd (D-VRd en la DB) · Ciclo 1
- Estado: validated · Por firmar
- Paciente: Manuel Tapia

## SESIÓN 10 — PRÓXIMA
Alcance:
1. Generación de PDF NOM-004 para la indicación creada
   - Datos: paciente, médico, protocolo, fármacos con dosis,
     fecha, ciclo, justificaciones de overrides
   - Formato: plantilla NOM-004-SSA3-2012
   - Descargable desde el perfil del paciente

2. Firma electrónica NOM-151 via Mifiel
   - Integración con API de Mifiel
   - El médico firma el PDF generado
   - La firma queda registrada en hema.signatures

3. OCR de resultados de laboratorio
   - Upload de imagen/PDF
   - Extracción de valores con Google Document AI o similar
   - Pre-llenado automático del formulario de labs

NOTAS PARA SESIÓN 10:
- El package hema-pdf (packages/hema-pdf/src/index.ts) está vacío — aquí va la lógica de PDF
- La tabla hema.signatures ya existe en el schema
- hema.orders tiene campo status: 'validated' | 'signed' | 'cancelled'
- La indicación VRd Ciclo 1 está en status 'validated' esperando firma

## INSTRUCCIÓN PARA CLAUDE CODE
Al iniciar sesión nueva:
"Lee HEMA_CONTEXTO_v3.md en la raíz del proyecto.
NO leas HEMA_PLAN_2.md.
NO ejecutes tsc ni typecheck.
[instrucciones específicas de la sesión]"