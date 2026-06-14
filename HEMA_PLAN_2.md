# HEMA-SALURAMA — Plan Técnico Completo v2.0
**Módulo Clínico Integrado · Indicaciones de Quimioterapia e Infusiones**
**Producto:** Salurama.com — Plan Clínico (módulo activable por suscripción)
**Autor:** Dr. Manuel Augusto Tapia Dávila
**Fecha:** Mayo 2026 · Versión ejecutable para Claude Code

---

## ▶ CÓMO USAR ESTE ARCHIVO

Este archivo es la fuente única de verdad para Claude Code.
Al inicio de CADA sesión pega exactamente esto:

```
Lee el archivo HEMA_PLAN.md completo desde la raíz del repo.
Luego ejecuta la Sesión [NÚMERO] de la Sección IX.
No escribas código hasta haber leído el plan completo.
```

Eso es todo. Claude Code encuentra las instrucciones detalladas aquí adentro.

---

## SECCIÓN I — DECISIÓN ESTRATÉGICA

### HEMA es un módulo dentro de Salurama, NO una app separada

**Por qué:**
- Los médicos ya tienen perfil verificado con cédula SEP en Salurama → activar HEMA es upsell en 1 clic
- Mismo login, mismo expediente de paciente, múltiples módulos clínicos
- Un proyecto Supabase, un deploy Vercel, un proceso COFEPRIS base
- Si COFEPRIS exige separación futura → migrar a `hema.salurama.com` sin reescribir código (el schema `hema` aislado ya lo permite)

### Modelo de producto
```
salurama.com
├── /directorio     ← existente (perfil médico verificado SEP)
├── /buscar         ← existente (pacientes buscan médico)
├── /hema           ← ESTE MÓDULO — MVP
│   ├── /hema/pacientes
│   ├── /hema/ordenes
│   ├── /hema/labs
│   └── /hema/admin
├── /onco           ← futuro (oncología sólida)
└── /reuma          ← futuro (reumatología, neurología)
```

### Monetización
| Plan | Contenido | Precio |
|------|-----------|--------|
| Gratuito | Directorio + búsqueda | $0 |
| Plan Clínico | Módulo HEMA + futuros módulos infusión | Por definir |

- El médico activa el módulo desde su perfil Salurama existente
- JWT claim adicional: `modules: ['hema']` — sin nuevo login

### Ruta regulatoria
- **MVP:** `salurama.com/hema` con disclaimer obligatorio en cada pantalla:
  *"Herramienta de soporte a la decisión clínica. El médico tratante es el único responsable de la prescripción."*
- **Con Registro Sanitario COFEPRIS:** migrar a `hema.salurama.com`
- **El schema `hema` separado** en Postgres facilita auditoría COFEPRIS aislada

---

## SECCIÓN II — REGLAS ABSOLUTAS PARA CLAUDE CODE

**Lee esto primero. Son no-negociables.**

### Reglas de integración
1. **Salurama ya existe. NO reescribas código existente.** Extiende, no reemplaza.
2. **El schema `public` de Supabase pertenece a Salurama.** Todo lo nuevo va en schema `hema`.
3. **Extiende el middleware.ts existente.** No lo reemplaces — agrégale el bloque `/hema`.
4. **Reutiliza componentes UI de Salurama** (navbar, theme, botones, inputs). No los dupliques.
5. **Antes de crear `hema.users`**, muéstrame la tabla de perfiles existente en Salurama para referenciarla correctamente.

### Reglas de código
6. **Sin `any` en TypeScript.** Si no sabes el tipo, define uno con Zod.
7. **Mínimo 3 tests por función clínica** (caso normal + caso límite + caso de fallo).
8. **Muéstrame el plan antes de ejecutar** en cualquier sesión que toque archivos existentes.
9. **Sin PHI en `console.log`, analytics, headers HTTP ni URL params.**
10. **Validación Zod en cliente Y servidor** para cada formulario clínico.

### Reglas clínicas (las más importantes)
11. **Doble capa de bloqueo clínico:** Edge Function valida → Trigger Postgres BEFORE INSERT rechaza. Nunca solo uno.
12. **El OCR nunca es fuente legal de verdad.** La imagen original + confirmación del médico son la fuente. `reviewed_by` debe estar lleno antes de vincular labs a una orden.
13. **BSA por defecto = Mosteller.** Guardar ambas (Mosteller + DuBois) para trazabilidad.
14. **Nunca auto-capear BSA a 2.0 m².** Es decisión del médico con justificación registrada (ASCO 2021).
15. **Vincristina cap 2 mg/ciclo** en adultos; **1.5 mg** si ≥70 años. No negociable.

### Skills de diseño a cargar por sesión
```
Sesiones con UI (5, 7, 8, 9, 10):
→ Lee /mnt/skills/public/frontend-design/SKILL.md ANTES de escribir cualquier componente

Sesión 10 (PDF):
→ Lee /mnt/skills/public/pdf/SKILL.md + /mnt/skills/public/pdf/REFERENCE.md

Sesión 9 (OCR pipeline):
→ Lee /mnt/skills/public/pdf-reading/SKILL.md
```

### Directiva de diseño UI para HEMA
```
Contexto: app clínica usada por hematólogos en hospital,
frecuentemente en celular durante pase de visita.

MOBILE-FIRST obligatorio:
- Diseña primero para 375px (iPhone SE), luego escala
- Touch targets mínimo 48x48px (dedos con guantes)
- Texto mínimo 16px en body, 20px en datos críticos de dosis
- El semáforo rojo/amarillo/verde debe ser visible bajo luz solar directa

Estética: "Precisión médica con calma humana"
- Sin blancos duros (#fff) → usar off-white (#F8F9FA o similar)
- Sin púrpuras genéricos de IA
- Paleta: azul médico profundo + verde lima de seguridad + rojo alerta saturado
- Tipografía: display legible a distancia + body de alta densidad
- Animaciones solo en transiciones de estado clínico (validación, firma)
- Nunca Inter/Roboto/Arial — elige fuentes con carácter clínico

Componentes críticos con diseño especial:
- Semáforo de validación: iconografía + color + texto (no solo color)
- Dosis calculada: número grande, unidad pequeña, fuente de cálculo visible
- Botón "Firmar indicación": el más importante de la app, debe serlo visualmente
- Panel de labs: lado a lado imagen OCR + tabla editable en mobile (scroll horizontal)
```

---

## SECCIÓN III — STACK TECNOLÓGICO

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | Next.js 14 App Router + TypeScript estricto | Existente en Salurama |
| Estilos | Tailwind CSS + shadcn/ui | Existente en Salurama |
| Backend/DB | Supabase (Postgres 15 + Auth + Storage + Realtime) | Existente en Salurama |
| Edge Functions | Supabase Deno | Nuevas, prefijo `hema-` |
| Auth | Supabase Auth + TOTP 2FA | Extender el existente |
| PDF | pdf-lib (JavaScript) | Compatible con Deno/Edge |
| OCR | Google Cloud Document AI | API externa, BAA disponible |
| Firma NOM-151 | Mifiel API | PSC acreditado México |
| Hosting | Vercel | Existente en Salurama |
| Monorepo | pnpm workspaces | Agregar al existente |
| Tests | Vitest + Playwright | Agregar, no reemplazar |
| CI | GitHub Actions | Agregar jobs hema-* |

---

## SECCIÓN IV — ESTRUCTURA DE ARCHIVOS

> El repo de Salurama ya existe. HEMA se integra dentro de él.
> NO se crea repo nuevo. Prefijo `hema-` o `hema_` en todo lo nuevo.

```
salurama/                                    ← repo existente
│
├── app/                                     ← Next.js existente
│   ├── (marketing)/                         ← NO TOCAR
│   ├── (auth)/                              ← NO TOCAR
│   ├── (dashboard)/                         ← NO TOCAR
│   │
│   ├── hema/                                ← NUEVO — módulo completo
│   │   ├── layout.tsx                       ← guard: verifica modules:['hema']
│   │   ├── page.tsx                         ← dashboard: resumen del día
│   │   │
│   │   ├── pacientes/
│   │   │   ├── page.tsx                     ← lista + búsqueda por CURP/nombre
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx                 ← form: CURP + datos + medición inicial
│   │   │   └── [id]/
│   │   │       ├── page.tsx                 ← perfil: historial mediciones + Dx + órdenes
│   │   │       └── medicion/
│   │   │           └── page.tsx             ← nueva medición (peso/talla → BSA auto)
│   │   │
│   │   ├── ordenes/
│   │   │   ├── page.tsx                     ← historial + filtros + estado
│   │   │   └── nueva/
│   │   │       └── page.tsx                 ← WIZARD 4 PASOS (componente principal)
│   │   │
│   │   ├── labs/
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx                 ← upload foto/PDF
│   │   │   └── [id]/
│   │   │       └── revisar/
│   │   │           └── page.tsx             ← side-by-side: imagen + tabla editable
│   │   │
│   │   └── admin/
│   │       ├── protocolos/
│   │       │   ├── page.tsx                 ← catálogo de protocolos
│   │       │   └── [id]/page.tsx            ← detalle + aprobación director médico
│   │       └── auditoria/
│   │           └── page.tsx                 ← bitácora inmutable + verificación hash
│   │
│   └── v/
│       └── [order_id]/
│           └── page.tsx                     ← verificador público QR (sin auth)
│
├── components/
│   └── hema/                                ← componentes específicos de HEMA
│       ├── ValidationSemaphore.tsx          ← semáforo rojo/amarillo/verde
│       ├── DoseDisplay.tsx                  ← número grande de dosis calculada
│       ├── BsaCard.tsx                      ← BSA con fórmula y fuente
│       ├── LabSideBySide.tsx                ← OCR review: imagen + tabla
│       ├── OrderWizard/                     ← wizard de 4 pasos
│       │   ├── Step1Patient.tsx
│       │   ├── Step2Protocol.tsx
│       │   ├── Step3Doses.tsx
│       │   └── Step4Sign.tsx
│       └── SignButton.tsx                   ← botón principal de firma FEA
│
├── packages/                                ← pnpm workspaces
│   ├── hema-shared/
│   │   ├── package.json
│   │   └── src/
│   │       ├── types.ts                     ← tipos Zod completos
│   │       ├── bsa.ts                       ← Mosteller + DuBois + tests
│   │       ├── ckd-epi.ts                   ← TFG CKD-EPI 2021 + Cockcroft-Gault
│   │       └── cie10.ts                     ← búsqueda fuzzy en catálogo
│   │
│   ├── hema-validator/
│   │   ├── package.json
│   │   └── src/
│   │       ├── engine.ts                    ← orchestrador de reglas
│   │       ├── types.ts                     ← ValidationResult, OrderInput
│   │       └── rules/
│   │           ├── r-bsa.ts                 ← R-BSA-01 a R-BSA-03
│   │           ├── r-lab.ts                 ← R-LAB-01 a R-LAB-11
│   │           ├── r-cumulative.ts          ← R-CUM-01 a R-CUM-07
│   │           ├── r-ddi.ts                 ← R-DDI-01 a R-DDI-07
│   │           ├── r-neuropathy.ts          ← R-NEU-01 a R-NEU-03
│   │           ├── r-age.ts                 ← R-AGE-01 a R-AGE-03
│   │           └── r-protocol.ts            ← R-PRO-01 a R-PRO-06
│   │
│   └── hema-pdf/
│       ├── package.json
│       └── src/
│           └── order-template.ts            ← generador PDF NOM-004
│
├── supabase/
│   ├── migrations/                          ← agregar al existente
│   │   ├── [ts]_hema_schema.sql             ← CREATE SCHEMA hema
│   │   ├── [ts]_hema_tenants.sql
│   │   ├── [ts]_hema_users.sql
│   │   ├── [ts]_hema_patients.sql
│   │   ├── [ts]_hema_measurements.sql
│   │   ├── [ts]_hema_diagnoses.sql
│   │   ├── [ts]_hema_protocols.sql
│   │   ├── [ts]_hema_drugs.sql
│   │   ├── [ts]_hema_lab_panels.sql
│   │   ├── [ts]_hema_orders.sql
│   │   ├── [ts]_hema_order_drugs.sql
│   │   ├── [ts]_hema_cumulative_doses.sql
│   │   ├── [ts]_hema_audit_log.sql
│   │   ├── [ts]_hema_signatures.sql
│   │   ├── [ts]_hema_rls_policies.sql
│   │   ├── [ts]_hema_triggers.sql
│   │   └── [ts]_hema_seed_cie10.sql
│   │
│   ├── functions/
│   │   ├── hema-orders-calculate/
│   │   │   └── index.ts                     ← BSA + dosis + validación → HTTP
│   │   ├── hema-orders-sign/
│   │   │   └── index.ts                     ← PDF + SHA-256 + Mifiel call
│   │   ├── hema-labs-ocr-ingest/
│   │   │   └── index.ts                     ← Google Document AI proxy
│   │   └── hema-audit-anchor/
│   │       └── index.ts                     ← cron diario → S3 object-lock
│   │
│   └── seed/
│       ├── hema_protocols.json              ← ≥45 protocolos con dosis
│       └── hema_drugs.json                  ← catálogo de fármacos con INN
│
├── tests/
│   ├── hema/
│   │   ├── rls/
│   │   │   └── cross-tenant.test.ts         ← ≥10 intentos por tabla
│   │   ├── validator/
│   │   │   └── *.test.ts                    ← ≥3 tests por regla clínica
│   │   └── e2e/
│   │       └── order-flow.spec.ts           ← Playwright: flujo completo <3 min
│   └── ...                                  ← tests existentes NO TOCAR
│
└── middleware.ts                             ← EXTENDER (no reemplazar)
```

---

## SECCIÓN V — ARQUITECTURA TÉCNICA

### Diagrama de flujo
```
Médico (celular/desktop) — ya autenticado en Salurama
  │ JWT con { user_id, tenant_id, modules: ['hema'], cedula_verified: true }
  │ HTTPS
  ▼
Next.js /hema/* — layout.tsx verifica claim 'hema'
  │ Si no tiene claim → redirect /planes (upgrade)
  │ Reutiliza: navbar, theme, componentes base de Salurama
  ▼
Supabase (proyecto existente de Salurama)
  ├── Schema 'public' → NO TOCAR (datos existentes de Salurama)
  ├── Schema 'hema' → TODO el módulo aquí
  │   ├── Postgres 15 con RLS por tenant_id
  │   ├── pgsodium: cifra nombre, CURP, NSS en columnas _encrypted
  │   └── Audit log inmutable + cadena SHA-256
  ├── Storage (buckets nuevos):
  │   ├── hema-lab-images/    → fotos/PDFs de laboratorios
  │   └── hema-order-pdfs/    → indicaciones firmadas
  ├── Edge Functions (Deno):
  │   ├── hema-orders-calculate → validación clínica + cálculo dosis
  │   ├── hema-orders-sign     → generación PDF + firma Mifiel
  │   ├── hema-labs-ocr-ingest → proxy Google Document AI
  │   └── hema-audit-anchor    → cron: hash diario a S3 object-lock
  └── Realtime → status órdenes para farmacia y enfermería

Servicios externos:
  Mifiel API        → NOM-151: constancia conservación + FEA del médico
  Google Doc AI     → OCR 98% precisión en resultados de laboratorio
  S3 object-lock    → anchor inmutable de cadena de hashes diaria
```

### Integración con Salurama (código)
```typescript
// middleware.ts — AGREGAR este bloque, no reemplazar nada
// Busca donde termina la lógica de auth existente y agrega:

if (request.nextUrl.pathname.startsWith('/hema')) {
  const token = await getToken({ req: request })
  const modules = (token?.modules as string[]) ?? []

  if (!modules.includes('hema')) {
    return NextResponse.redirect(new URL('/planes?upgrade=hema', request.url))
  }
}

// hema/layout.tsx — lee perfil del médico desde Salurama
// NO duplica datos — los referencia desde la tabla existente
const doctorProfile = await supabase
  .from('profiles')  // ← tabla EXISTENTE de Salurama (nombre real puede variar)
  .select('full_name, cedula_profesional, specialty')
  .eq('id', user.id)
  .single()
// Si la tabla tiene otro nombre, la Sesión 0 lo descubrirá
```

### Auth Hook Supabase (nuevo)
```typescript
// supabase/functions/hema-auth-hook/index.ts
// Se ejecuta después de cada login exitoso
// Agrega el claim 'modules' al JWT según la suscripción del usuario

const { data: subscription } = await supabase
  .from('subscriptions')  // tabla Salurama existente (nombre real en Sesión 0)
  .select('modules')
  .eq('user_id', userId)
  .single()

return {
  ...existingClaims,
  modules: subscription?.modules ?? [],
  tenant_id: subscription?.tenant_id
}
```

---

## SECCIÓN VI — BASE DE DATOS (Schema `hema`)

### Política RLS universal
```sql
-- Aplicar a CADA tabla clínica del schema hema:
ALTER TABLE hema.[tabla] ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON hema.[tabla]
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

### Tablas completas

```sql
-- ═══════════════════════════════════════
-- IDENTIDAD Y TENENCIA
-- ═══════════════════════════════════════

CREATE TABLE hema.tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  rfc         text,
  clues       text,
  cofepris_license text,
  created_at  timestamptz DEFAULT now()
);

-- hema.users referencia auth.users de Salurama (mismo ID)
-- NO duplica nombre ni cédula — los lee de la tabla de perfiles existente
CREATE TABLE hema.users (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id),
  tenant_id             uuid REFERENCES hema.tenants(id) NOT NULL,
  role                  text NOT NULL CHECK (role IN ('admin','medico','enfermeria','farmacia','auditor')),
  totp_enrolled         boolean DEFAULT false,
  psc_signature_provider text,   -- 'mifiel' o 'advantage'
  psc_user_id           text,
  active                boolean DEFAULT true
);

-- ═══════════════════════════════════════
-- PACIENTES
-- ═══════════════════════════════════════

CREATE TABLE hema.patients (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL,
  -- CURP regex: ^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$
  curp                   text NOT NULL,
  nss                    text,
  full_name_encrypted    bytea NOT NULL,       -- pgsodium
  birth_date             date NOT NULL,
  sex                    text CHECK (sex IN ('M','F')),
  contact_phone_encrypted bytea,
  allergies              text,                 -- texto libre, visible en orden
  created_at             timestamptz DEFAULT now(),
  UNIQUE (tenant_id, curp)                     -- previene CURP duplicado
);

-- Mediciones versionadas (nunca editar, solo agregar nuevas)
-- BSA se calcula automáticamente como columna generada
CREATE TABLE hema.patient_measurements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid REFERENCES hema.patients(id) NOT NULL,
  measured_at  timestamptz NOT NULL,
  weight_kg    numeric(5,2) NOT NULL CHECK (weight_kg BETWEEN 20 AND 250),
  height_cm    numeric(5,1) NOT NULL CHECK (height_cm BETWEEN 100 AND 220),
  -- Mosteller (DEFAULT): sqrt((kg * cm) / 3600)
  -- Verificación: 66 kg / 160 cm = 1.71 m²
  bsa_mosteller numeric(4,2) GENERATED ALWAYS AS
    (ROUND(CAST(sqrt((weight_kg * height_cm) / 3600.0) AS numeric), 2)) STORED,
  -- DuBois: 0.007184 * kg^0.425 * cm^0.725
  bsa_dubois   numeric(4,2) GENERATED ALWAYS AS
    (ROUND(CAST(0.007184 * power(weight_kg, 0.425) * power(height_cm, 0.725) AS numeric), 2)) STORED,
  recorded_by  uuid NOT NULL
);

-- ═══════════════════════════════════════
-- DIAGNÓSTICOS CIE-10
-- ═══════════════════════════════════════

CREATE TABLE hema.diagnoses (
  code           text PRIMARY KEY,  -- e.g. 'C90.0'
  description_es text NOT NULL,
  description_en text,
  category       text               -- 'mieloma','linfoma','leucemia','mds','mpn','otro'
);

CREATE TABLE hema.patient_diagnoses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid REFERENCES hema.patients(id) NOT NULL,
  diagnosis_code  text REFERENCES hema.diagnoses(code) NOT NULL,
  diagnosed_at    date NOT NULL,
  staging         text,
  cytogenetics    jsonb,
  is_primary      boolean DEFAULT true
);

-- ═══════════════════════════════════════
-- PROTOCOLOS Y FÁRMACOS
-- ═══════════════════════════════════════

CREATE TABLE hema.drugs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn                     text NOT NULL UNIQUE,  -- nombre internacional
  trade_names             text[] DEFAULT '{}',
  atc_code                text,
  is_anthracycline        boolean DEFAULT false,
  is_vesicant             boolean DEFAULT false,
  cumulative_max_mg_m2    numeric,               -- doxo: 450, bleo: 400 U
  cyp3a4_substrate        boolean DEFAULT false,
  cyp3a4_strong_inhibitor boolean DEFAULT false,
  requires_hbv_screen     boolean DEFAULT false, -- anti-CD20
  requires_pft            boolean DEFAULT false  -- bleomicina
);

CREATE TABLE hema.protocols (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                       text UNIQUE NOT NULL,   -- e.g. 'VRD'
  name                       text NOT NULL,
  cycle_length_days          int NOT NULL,
  total_cycles               int,
  line_of_therapy            text,                   -- '1L','2L','mantenimiento'
  references                 jsonb,                  -- {doi, pubmed_id, guideline}
  active                     boolean DEFAULT false,  -- inactivo hasta aprobación
  approved_by_medical_director uuid,
  approved_at                timestamptz,
  specialty                  text DEFAULT 'hematologia'
);

CREATE TABLE hema.protocol_diagnoses (
  protocol_id    uuid REFERENCES hema.protocols(id),
  diagnosis_code text REFERENCES hema.diagnoses(code),
  is_preferred   boolean DEFAULT false,
  PRIMARY KEY (protocol_id, diagnosis_code)
);

CREATE TABLE hema.protocol_drugs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id      uuid REFERENCES hema.protocols(id),
  drug_id          uuid REFERENCES hema.drugs(id),
  dose_value       numeric NOT NULL,
  dose_unit        text NOT NULL CHECK (dose_unit IN ('mg/m2','mg/kg','mg','U/m2','UI','MUI')),
  route            text NOT NULL CHECK (route IN ('IV','SC','PO','IT','IM','CIV','IVP')),
  days_of_cycle    int[] NOT NULL,              -- e.g. {1,4,8,11}
  max_dose_mg      numeric,                     -- vincristina: 2 mg cap
  infusion_minutes int,
  vehicle          text,                        -- 'Salina 0.9% 50ml'
  premed_required  jsonb,                       -- premedicaciones por protocolo
  sequence_order   int                          -- orden de infusión
);

-- ═══════════════════════════════════════
-- LABORATORIOS
-- ═══════════════════════════════════════

CREATE TABLE hema.lab_panels (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                uuid NOT NULL,
  tenant_id                 uuid NOT NULL,
  collected_at              timestamptz NOT NULL,
  source                    text CHECK (source IN ('manual','ocr','fhir')),
  ocr_image_path            text,              -- path en Storage hema-lab-images/
  ocr_raw_json              jsonb,             -- respuesta cruda de Document AI
  ocr_confidence            numeric,
  reviewed_by               uuid,             -- NULL hasta confirmación del médico
  reviewed_at               timestamptz,
  fhir_diagnostic_report_id text              -- para futura integración HL7/FHIR
);

CREATE TABLE hema.lab_values (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id        uuid REFERENCES hema.lab_panels(id),
  loinc           text,                        -- e.g. '751-8' para neutrófilos
  analyte         text NOT NULL,               -- nombre en español
  value           numeric,
  unit            text,
  reference_low   numeric,
  reference_high  numeric,
  flag            text,                        -- 'L','H','LL','HH'
  ocr_confidence  numeric,                     -- <0.85 = requiere revisión visual
  manually_edited boolean DEFAULT false
);

-- ═══════════════════════════════════════
-- ÓRDENES DE QUIMIOTERAPIA
-- ═══════════════════════════════════════

CREATE TABLE hema.orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL,
  patient_id            uuid REFERENCES hema.patients(id) NOT NULL,
  protocol_id           uuid REFERENCES hema.protocols(id) NOT NULL,
  diagnosis_code        text REFERENCES hema.diagnoses(code) NOT NULL,
  cycle_number          int NOT NULL,
  day_of_cycle          int NOT NULL,
  measurement_id        uuid REFERENCES hema.patient_measurements(id) NOT NULL,
  lab_panel_id          uuid REFERENCES hema.lab_panels(id),
  bsa_used              numeric(4,2) NOT NULL,
  bsa_formula           text NOT NULL CHECK (bsa_formula IN ('mosteller','dubois')),
  ecog                  int CHECK (ecog BETWEEN 0 AND 4),
  scheduled_for         date NOT NULL,
  status                text NOT NULL DEFAULT 'draft' CHECK (
                          status IN ('draft','validated','signed',
                                     'dispensed','administered','cancelled')),
  cancel_reason         text,
  signed_at             timestamptz,
  signed_by             uuid,
  co_signed_by          uuid,                  -- segunda firma para overrides críticos
  nom151_constancia_id  text,                  -- ID en Mifiel
  nom151_constancia_url text,                  -- URL de la constancia
  pdf_path              text,                  -- path en Storage hema-order-pdfs/
  pdf_sha256            text,                  -- hash SHA-256 del PDF
  qr_payload            text,                  -- URL verify.salurama.com/v/[id]
  created_at            timestamptz DEFAULT now(),
  created_by            uuid NOT NULL,
  -- Disclaimer NOM-004 — siempre presente
  disclaimer            text DEFAULT 'Herramienta de soporte a la decisión clínica. El médico tratante es el único responsable de la prescripción.'
);

CREATE TABLE hema.order_drugs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid REFERENCES hema.orders(id) ON DELETE CASCADE,
  protocol_drug_id uuid REFERENCES hema.protocol_drugs(id),
  drug_id          uuid REFERENCES hema.drugs(id),
  computed_dose_mg numeric NOT NULL,           -- dosis calculada final
  base_dose_mg     numeric NOT NULL,           -- dosis sin reducción
  reduction_pct    numeric DEFAULT 0,
  reduction_reason text,
  route            text NOT NULL,
  infusion_minutes int,
  vehicle          text,
  given_on_day     int NOT NULL,
  warnings         jsonb DEFAULT '[]'::jsonb,  -- array de ValidationResult
  override_reason  text,                       -- si hubo override de regla clínica
  pharmacy_verified boolean DEFAULT false
);

CREATE TABLE hema.cumulative_doses (
  patient_id       uuid,
  drug_id          uuid,
  cumulative_mg_m2 numeric DEFAULT 0,
  last_dose_at     timestamptz,
  PRIMARY KEY (patient_id, drug_id)
);

-- ═══════════════════════════════════════
-- AUDITORÍA INMUTABLE
-- ═══════════════════════════════════════

CREATE TABLE hema.audit_log (
  id            bigserial PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  user_id       uuid,
  action        text NOT NULL,               -- INSERT/UPDATE/DELETE
  entity        text NOT NULL,               -- nombre de la tabla
  entity_id     uuid,
  before_json   jsonb,
  after_json    jsonb,
  ip_address    inet,
  user_agent    text,
  prev_row_hash text,                        -- hash de la fila anterior
  row_hash      text NOT NULL,               -- SHA-256 del contenido actual
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- INMUTABLE — nadie puede modificar ni borrar el log
CREATE RULE audit_no_update AS ON UPDATE TO hema.audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO hema.audit_log DO INSTEAD NOTHING;

CREATE TABLE hema.audit_anchors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_date  date NOT NULL UNIQUE,
  row_hash     text NOT NULL,               -- último hash del día
  s3_path      text NOT NULL,               -- path en bucket object-lock
  created_at   timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════
-- FIRMAS NOM-151
-- ═══════════════════════════════════════

CREATE TABLE hema.signatures (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                    uuid REFERENCES hema.orders(id),
  user_id                     uuid NOT NULL,
  psc_provider                text NOT NULL,    -- 'mifiel'
  psc_document_id             text NOT NULL,
  signed_hash                 text NOT NULL,
  constancia_de_conservacion  bytea,            -- archivo constancia del PSC
  signed_at                   timestamptz NOT NULL
);
```

### Trigger de bloqueo clínico (Postgres)
```sql
-- Se activa ANTES de insertar una orden
-- Llama al validador vía pg_net y rechaza si hay bloques sin override
CREATE OR REPLACE FUNCTION hema.validate_order_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  validation_result jsonb;
BEGIN
  -- Llamada síncrona al motor de validación
  SELECT content::jsonb INTO validation_result
  FROM http_post(
    'https://[proyecto].supabase.co/functions/v1/hema-orders-calculate',
    row_to_json(NEW)::text,
    'application/json'
  );

  -- Bloquear si hay reglas 'block' sin override firmado
  IF validation_result->'hasUnresolvedBlocks' = 'true'::jsonb THEN
    RAISE EXCEPTION 'HEMA-BLOCK: %',
      validation_result->>'blockMessage';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hema_order_clinical_validation
  BEFORE INSERT ON hema.orders
  FOR EACH ROW EXECUTE FUNCTION hema.validate_order_before_insert();
```

---

## SECCIÓN VII — MOTOR DE VALIDACIÓN CLÍNICA

### Tipos TypeScript
```typescript
// packages/hema-validator/src/types.ts

export interface OrderInput {
  patient: {
    weight_kg: number
    height_cm: number
    bsa_mosteller: number
    bsa_dubois: number
    age: number
    sex: 'M' | 'F'
    allergies?: string
  }
  labs: {
    anc?: number          // neutrófilos absolutos /µL
    platelets?: number    // plaquetas /µL
    hemoglobin?: number   // g/dL
    creatinine?: number   // mg/dL
    crcl?: number         // Cockcroft-Gault mL/min
    bilirubin_total?: number  // mg/dL
    ast?: number          // U/L
    alt?: number          // U/L
    lvef?: number         // %
    collected_at: string  // ISO date — lab de ≤30 días
  }
  protocol: {
    code: string
    drugs: Array<{
      inn: string
      dose_mg: number
      dose_per_m2: number
      is_anthracycline: boolean
      cyp3a4_substrate: boolean
      cumulative_max_mg_m2?: number
    }>
  }
  neuropathy_grade?: 0 | 1 | 2 | 3 | 4
  ecog?: 0 | 1 | 2 | 3 | 4
  concurrent_medications?: string[]
  cumulative_doses?: Record<string, number>  // inn → mg/m² acumulado
  overrides?: Array<{
    rule_id: string
    reason: string          // ≥30 chars
    override_by: string     // user_id
    co_signed_by?: string   // para las 5 clases críticas
  }>
}

export interface ValidationResult {
  ruleId: string
  severity: 'block' | 'warn' | 'info'
  message_es: string
  drug_inn?: string
  suggested_dose_mg?: number
  reduction_pct?: number
  override_allowed: boolean
  requires_second_signer: boolean  // 5 clases críticas
}
```

### Motor principal
```typescript
// packages/hema-validator/src/engine.ts

import { bsaRules }        from './rules/r-bsa'
import { labRules }        from './rules/r-lab'
import { cumulativeRules } from './rules/r-cumulative'
import { ddiRules }        from './rules/r-ddi'
import { neuropathyRules } from './rules/r-neuropathy'
import { ageRules }        from './rules/r-age'
import { protocolRules }   from './rules/r-protocol'

export function validateOrder(input: OrderInput): ValidationResult[] {
  const allRules = [
    ...bsaRules,
    ...labRules,
    ...cumulativeRules,
    ...ddiRules,
    ...neuropathyRules,
    ...ageRules,
    ...protocolRules,
  ]

  const results: ValidationResult[] = []

  for (const rule of allRules) {
    const result = rule.evaluate(input)
    if (result) results.push(result)
  }

  // Filtrar overrides autorizados
  return results.filter(r => {
    const override = input.overrides?.find(o => o.rule_id === r.ruleId)
    if (!override) return true
    if (r.requires_second_signer && !override.co_signed_by) return true
    return false
  })
}

export function hasUnresolvedBlocks(results: ValidationResult[]): boolean {
  return results.some(r => r.severity === 'block')
}
```

### Reglas completas

#### BSA (r-bsa.ts)
| ID | Condición | Severidad | Acción |
|----|-----------|-----------|--------|
| R-BSA-01 | Default Mosteller, guardar ambas | info | Solo registro |
| R-BSA-02 | BSA > 2.0 m² — no auto-capear (ASCO 2021) | warn | Decisión médico con log |
| R-BSA-03 | Peso/talla fuera de rango fisiológico | block | Solicitar nueva medición |

#### Laboratorio (r-lab.ts)
| ID | Condición | Severidad |
|----|-----------|-----------|
| R-LAB-01 | ANC < 1,000/µL | **block** (excepto HMAs en MDS) |
| R-LAB-02 | Plaquetas < 50,000/µL | **block** bortezomib + antraciclinas |
| R-LAB-03 | Plaquetas < 100,000/µL | warn |
| R-LAB-04 | Hgb < 8 g/dL | warn + recomendar transfusión |
| R-LAB-05 | CrCl < 30 mL/min | **block** bleomicina · lenalidomida → 5 mg |
| R-LAB-06 | CrCl < 50 mL/min | warn bleomicina |
| R-LAB-07 | Bilirrubina 1.2–3 mg/dL | warn · doxo –50% |
| R-LAB-08 | Bilirrubina 3.1–5 mg/dL | warn · doxo –75% |
| R-LAB-09 | AST/ALT > 3× LSN | warn · vincristina –50% |
| R-LAB-10 | AST/ALT > 5× LSN | **block** vincristina |
| R-LAB-11 | FEVI < 50% | **block** antraciclinas |
| R-LAB-12 | Labs con fecha > 30 días | warn · solicitar labs recientes |

#### Dosis acumulada (r-cumulative.ts)
| ID | Fármaco | Límite | Fuente |
|----|---------|--------|--------|
| R-CUM-01 | Doxorubicina | 450 mg/m² | FDA Adriamycin NDA 062921 |
| R-CUM-02 | Epirrubicina | 900 mg/m² | — |
| R-CUM-03 | Daunorrubicina | 550 mg/m² | — |
| R-CUM-04 | Idarrubicina | 150 mg/m² | — |
| R-CUM-05 | Mitoxantrona | 140 mg/m² | — |
| R-CUM-06 | Bleomicina | 400 U total | — |
| R-CUM-07 | Cisplatino | warn ≥300 mg/m² | — |

> Con RT mediastinal previa: reducir límite doxorubicina a 350 mg/m²

#### Interacciones (r-ddi.ts)
| ID | Interacción | Severidad |
|----|-------------|-----------|
| R-DDI-01 | Bortezomib + inhibidor fuerte CYP3A4 | warn |
| R-DDI-02 | Lenalidomida/Talidomida sin profilaxis TEV | **block** |
| R-DDI-03 | Vincristina + inhibidor fuerte CYP3A4 | **block** |
| R-DDI-04 | Ibrutinib + warfarina | **block** |
| R-DDI-05 | MTX + AINEs/TMP-SMX/penicilinas | warn |
| R-DDI-06 | MTX ≥1 g/m² sin plan leucovorin | **block** |
| R-DDI-07 | Alopurinol + 6-MP/azatioprina | warn · reducir 75% |

#### Neuropatía periférica CTCAE v5 (r-neuropathy.ts)
| ID | Fármaco | Grado | Acción |
|----|---------|-------|--------|
| R-NEU-01 | Bortezomib | G1 sin dolor | Sin cambio |
| R-NEU-01 | Bortezomib | G1 con dolor / G2 | warn · 1.3 → 1.0 mg/m² |
| R-NEU-01 | Bortezomib | G2 con dolor / G3 | warn · hold → reinicio a –2 niveles + semanal |
| R-NEU-01 | Bortezomib | G4 | **block** permanente |
| R-NEU-02 | Vincristina | G2+ | warn · –50% |
| R-NEU-02 | Vincristina | G3 | **block** · hold |
| R-NEU-02 | Vincristina | G4 | **block** · descontinuar |
| R-NEU-03 | Talidomida | G2+ | warn · –50 mg/día |

#### Edad y fragilidad (r-age.ts)
| ID | Condición | Acción |
|----|-----------|--------|
| R-AGE-01 | Vincristina · cualquier edad | cap 2 mg/ciclo |
| R-AGE-01 | Vincristina · ≥70 años | cap 1.5 mg/ciclo |
| R-AGE-02 | ≥75a o IMWG frágil ≥2 | warn · recomendar Rd-light |
| R-AGE-03 | ≥60a + AraC dosis alta | warn · cap 1.5 g/m² q12h |

#### Específicas de protocolo (r-protocol.ts)
| ID | Condición | Acción |
|----|-----------|--------|
| R-PRO-01 | APL + leucocitos >10×10⁹/L | **block** sin prednisona profiláctica |
| R-PRO-02 | Burkitt + alta carga tumoral | **block** sin profilaxis SLT + rasburicasa |
| R-PRO-03 | Anti-CD20 sin serología VHB | **block** (HBsAg + anti-HBc requeridos <90d) |
| R-PRO-04 | Corticoesteroide ≥4 sem sin profilaxis PJP | **block** |
| R-PRO-05 | Daratumumab · primera infusión | warn · verificar protocolo SC vs IV |
| R-PRO-06 | MTX ≥1 g/m² sin leucovorin plan | **block** |

### Override governance
```
Solo role='medico' puede hacer override.
Justificación ≥30 caracteres obligatoria.

Las siguientes 5 clases requieren segunda firma (co_signed_by):
  1. Cap acumulado antraciclinas superado
  2. Vincristina + inhibidor CYP3A4 fuerte
  3. FEVI < 50% con antraciclinas
  4. ATRA/ATO con QTc prolongado
  5. Niveles MTX elevados (aclaramiento insuficiente)

El trigger Postgres NO acepta overrides sin co_signed_by en estas 5 clases.
```

---

## SECCIÓN VIII — PROTOCOLOS (≥45 regímenes)

### Fármacos base (seed: hema_drugs.json)
Incluye: Bortezomib, Lenalidomida, Talidomida, Pomalidomida, Daratumumab,
Carfilzomib, Doxorubicina (is_anthracycline:true, cumulative_max:450),
Epirrubicina (900), Daunorrubicina (550), Vincristina (max_dose:2mg),
Rituximab (requires_hbv_screen:true), Ciclofosfamida, Dexametasona,
Bleomicina (cumulative_max:400U, requires_pft:true), Citarabina,
Metotrexato, Etopósido, Ifosfamida, Bendamustina, Azacitidina,
Decitabina, Venetoclax, Ibrutinib, Acalabrutinib, Zanubrutinib,
Cladribina, Pentostatina, Fludarabina, ATRA (tretinoína),
Trióxido de Arsénico, Brentuximab Vedotin, Midostaurina,
Obinutuzumab, Hidroxiurea, Ruxolitinib, Luspatercept,
Polatuzumab Vedotin, Blinatumomab.

### Protocolos por diagnóstico

#### Mieloma Múltiple (C90.0)
| Código | Nombre | Ciclo | Fármacos + Dosis principales |
|--------|--------|-------|------------------------------|
| VRD | Bortezomib-Len-Dex | 21d | Btz 1.3 mg/m² SC d1,4,8,11 · Len 25 mg PO d1–14 · Dex 20 mg d1,2,4,5,8,9,11,12 |
| VTD | Bortezomib-Thal-Dex | 21d | Btz 1.3 mg/m² SC d1,4,8,11 · Thal 100–200 mg PO diario · Dex 40 mg d1,8,15,22 |
| VCD | CyBorD | 28d | Btz 1.3 mg/m² SC d1,8,15,22 · Ciclo 300 mg/m² PO d1,8,15,22 · Dex 40 mg semanal |
| D-VRD | Dara-VRD | 21/28d | Dara 1800 mg SC (o 16 mg/kg IV) + VRd |
| D-VTD | Dara-VTD (CASSIOPEIA) | 21d | Dara + VTd |
| KRD | Carfilzomib-Len-Dex | 28d | Carfil 20→56 mg/m² d1,2,8,9,15,16 · Len 25 mg d1–21 · Dex 40 mg semanal |
| RD-LIGHT | Rd reducido (frágil/≥80a) | 28d | Len 10–15 mg d1–21 · Dex 20 mg semanal |
| DPD | Dara-Poma-Dex | 28d | Dara + Poma 4 mg d1–21 · Dex 40 mg semanal |

#### Amiloidosis AL (E85.81)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| D-VCD | Dara-CyBorD (ANDROMEDA) | Dara 1800 mg SC: semanal C1–2, q2s C3–6, q4s ×24m · Btz 1.3 mg/m² SC semanal · Ciclo 300 mg/m² semanal · Dex 20–40 mg semanal |

#### Waldenström (C88.0)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| DRC | Dex-Rtx-Ciclo | Dex 20 mg IV d1 · Rtx 375 mg/m² d1 · Ciclo 100 mg/m² PO BID d1–5 · 21d ×6 |
| BR-W | Benda-Rtx | Benda 90 mg/m² d1,2 · Rtx 375 mg/m² d1 · 28d ×6 |
| IBR-W | Ibrutinib ± Rtx | Ibr 420 mg PO diario continuo |

#### Linfoma Hodgkin (C81.x)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| ABVD | ABVD | Doxo 25 mg/m² + Bleo 10 U/m² + Vinb 6 mg/m² + DTIC 375 mg/m² IV d1,15 · 28d |
| AVD | AVD sin bleo | Doxo 25 + Vinb 6 + DTIC 375 mg/m² d1,15 · 28d |
| BV-AVD | Brentuximab-AVD | BV 1.2 mg/kg d1,15 + AVD |
| BEACOPP | Escalado | Bleo 10 U/m² d8 · Etop 200 mg/m² d1–3 · Doxo 35 mg/m² d1 · Ciclo 1250 mg/m² d1 · VCR 1.4 mg/m² cap 2 mg d8 · Procarb 100 mg/m² d1–7 · Pred 40 mg/m² d1–14 · 21d |

#### LNH Agresivo B (C83.3, C85.3)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| R-CHOP-21 | R-CHOP estándar | Rtx 375 mg/m² d1 · Ciclo 750 mg/m² d1 · Doxo 50 mg/m² d1 · VCR 1.4 mg/m² **cap 2 mg** (cap 1.5 si ≥70a) d1 · Pred 100 mg PO d1–5 · 21d ×6–8 |
| R-CHOP-14 | R-CHOP q14d | Igual + G-CSF d2–13 |
| POLA-RCHP | Pola-R-CHP (POLARIX) | Pola 1.8 mg/kg d1 + R-CHP (VCR omitido) |
| DA-EPOCH-R | DA-EPOCH-R | Etop 50 mg/m²/d CIV d1–4 · VCR 0.4 mg/m²/d CIV d1–4 · Doxo 10 mg/m²/d CIV d1–4 · Ciclo 750 mg/m² d5 · Pred 60 mg/m² BID d1–5 · Rtx 375 mg/m² d1 · 21d |
| R-CEOP | R-CEOP (cardiopatía) | Etopósido 75 mg/m² d1–3 reemplaza Doxo |

#### Burkitt / Alto grado (C83.7)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| R-CODOX-M | Ciclos impares | Rtx 375 mg/m² d1,9 · Ciclo 800 mg/m² d1 + 200 mg/m² d2–5 · VCR 1.5 mg/m² d1,8 · Doxo 40 mg/m² d1 · MTX 3000 mg/m² d10 |
| R-IVAC | Ciclos pares | Rtx 375 mg/m² d3,7 · Ifos 1500 mg/m² d1–5 · Etop 60 mg/m² d1–5 · AraC 2 g/m² d1,2 |

#### LNH Indolente / Folicular (C82.x)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| BR-F | Benda-Rtx folicular | Benda 90 mg/m² d1,2 · Rtx 375 mg/m² d1 · 28d ×6 |
| R-CHOP-F | R-CHOP folicular | Igual R-CHOP-21 |
| R-CVP | R-CVP | Rtx 375 · Ciclo 750 · VCR 1.4 mg/m² cap 2 mg · Pred 40 mg/m² d1–5 · 21d |
| OBI-BENDA | Obi-Benda (GALLIUM) | Obi 1000 mg d1,8,15 C1 luego d1 · Benda 90 mg/m² d1,2 |
| RTX-MANT | Rtx mantenimiento | Rtx 375 mg/m² q2 meses ×2 años |

#### Manto (C83.1)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| VR-CAP | VR-CAP | Btz 1.3 mg/m² reemplaza VCR en R-CHOP |
| BR-MCL | BR manto | Benda 90 mg/m² d1,2 · Rtx 375 mg/m² d1 · 28d |

#### LSNC Primario (C85.7 / C71.9)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| MATRIX | MATRix (IELSG32) | MTX 3.5 g/m² d1 · AraC 2 g/m² BID d2,3 · Rtx 375 mg/m² d-5,0 · Tiotepa 30 mg/m² d4 · q3s ×4 |

#### LMA (C92.0, C92.4 APL, C92.5, C92.6)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| 7+3 | Inducción estándar | AraC 100–200 mg/m²/d CIV d1–7 · Dauno 60–90 mg/m² IV d1–3 |
| 7+3-MIDO | 7+3 + Midostaurina (FLT3+) | 7+3 + Mido 50 mg PO q12h d8–21 |
| HIDAC | Consolidación HiDAC | AraC 3 g/m² q12h d1,3,5 (cap 1.5 g/m² si ≥60a) |
| CPX-351 | Vyxeos (AML-MRC) | CPX-351 100/44 mg/m² IV d1,3,5 |
| AZA-VEN | Aza + Venetoclax (VIALE-A) | Aza 75 mg/m² SC/IV d1–7 · Ven rampa 100→200→400 mg PO · 28d |
| ATRA-ATO | LPA bajo riesgo (Lo-Coco NEJM 2013) | ATRA 45 mg/m²/d PO BID hasta RC · ATO 0.15 mg/kg/d IV · Prednisona 0.5 mg/kg profilaxis |
| ATO-CONS | Consolidación LPA | ATO 0.15 mg/kg 5d/sem 4s-on/4s-off ×4 · ATRA 2s-on/2s-off ×7 |

#### LLA (C91.0)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| HCVAD-A | Hyper-CVAD A | Ciclo 300 mg/m² IV q12h d1–3 · VCR 2 mg flat d4,11 · Doxo 50 mg/m² d4 · Dex 40 mg d1–4,d11–14 · IT-MTX d2 · IT-AraC d7 |
| HCVAD-B | Hyper-CVAD B | MTX 1 g/m² IV 24h d1 · AraC 3 g/m² IV q12h d2,3 |
| BLIN | Blinatumomab (MRD+) | 28 µg/d CIV ×28d q6s |

#### LMC (C92.1)
| Código | Fármaco | Dosis |
|--------|---------|-------|
| IMA | Imatinib 1L | 400 mg PO diario |
| DASA | Dasatinib 1L | 100 mg PO diario |
| NILO | Nilotinib 1L | 300 mg PO BID |
| BOSA | Bosutinib 1L | 400 mg PO diario |
| PONA | Ponatinib (T315I) | 30–45 mg PO diario |

#### LLC/SLL (C91.1)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| ACALA | Acalabrutinib ± Obi | Acala 100 mg PO BID continuo |
| IBR-R | Ibrutinib + Rtx (E1912) | Ibr 420 mg diario · Rtx 50/325/500 mg/m² C2+ |
| ZANU | Zanubrutinib | 160 mg PO BID |
| VEN-OBI | Venetoclax + Obi | Ven rampa 5s → 400 mg d1–28 ×12c · Obi 1000 mg d1,8,15 C1 |
| FCR | FCR (jóvenes IGHV mut) | Fuda 25 mg/m² d1–3 · Ciclo 250 mg/m² d1–3 · Rtx 375/500 mg/m² · 28d ×6 |

#### Tricoleucemia (C91.4)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| CLAD | Cladribina | 0.1 mg/kg/d CIV ×7d (o 0.14 mg/kg IV 2h ×5d o SC) |
| PENTO | Pentostatina | 4 mg/m² IV q2 semanas hasta RC |

#### MDS (D46.x)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| AZA | Azacitidina (AZA-001) | 75 mg/m² SC d1–7 · 28d (o 5+2: d1–5 + d8,9) |
| DECI | Decitabina | 20 mg/m² IV d1–5 · 28d |
| AZA-VEN-MDS | Aza + Ven (alto riesgo) | Aza 75 mg/m² d1–7 · Ven 400 mg d1–14 · 28d |
| LEN-MDS | Lenalidomida del(5q) | 10 mg PO d1–21 · 28d |
| LUSPA | Luspatercept (anemia) | 1.0–1.75 mg/kg SC q3s |

#### MPN (D45, D47.x)
| Código | Nombre | Fármacos |
|--------|--------|----------|
| HU | Hidroxiurea | 15–20 mg/kg/d PO |
| RUXO | Ruxolitinib (MF) | 5–25 mg PO BID (según plaquetas) |
| PEG-IFN | PEG-IFN α-2a | 45–180 µg SC semanal |

---

## SECCIÓN IX — PLAN DE EJECUCIÓN CLAUDE CODE

### Skills a cargar (por tipo de sesión)
```
SESIONES DE UI (5, 7, 8, 9):
  Lee /mnt/skills/public/frontend-design/SKILL.md ANTES de cualquier componente

SESIÓN PDF (10):
  Lee /mnt/skills/public/pdf/SKILL.md
  Lee /mnt/skills/public/pdf/REFERENCE.md

SESIÓN OCR (9):
  Lee /mnt/skills/public/pdf-reading/SKILL.md
```

---

### SESIÓN 0 — Auditoría de Salurama (OBLIGATORIA PRIMERO)

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo.
Luego ejecuta la Sesión 0.

Sin escribir código, necesito un inventario completo de Salurama:

1. Lista TODOS los archivos en app/ con una línea de descripción de cada uno
2. Muéstrame el middleware.ts completo
3. ¿Existe tabla de perfiles/médicos en schema public?
   Muéstrame su estructura exacta (columnas, tipos, constraints)
4. ¿Existe tabla de suscripciones o planes?
   Muéstrame su estructura
5. ¿Tiene Salurama 2FA implementado? ¿Cómo?
6. Lista todos los componentes en components/ o ui/
7. Lista Edge Functions existentes en supabase/functions/
8. ¿Qué variables de entorno están en .env.example?
9. ¿Qué scripts existen en package.json?
10. ¿Existe configuración de pnpm workspaces?

Entrega un reporte estructurado con:
A) Lo que HEMA puede reutilizar directamente
B) Lo que necesita extender
C) Lo que debe crear desde cero
D) Conflictos potenciales detectados
E) Nombre exacto de la tabla de perfiles de médicos (para referenciarla en hema.users)
F) Nombre exacto de la tabla de suscripciones (para el JWT hook)
```

---

### SESIÓN 1 — Paquetes y configuración base

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 1.
Usa los hallazgos de la Sesión 0 para saber qué ya existe.

Crea los tres paquetes pnpm en packages/:
  - packages/hema-shared/
  - packages/hema-validator/
  - packages/hema-pdf/

Para cada uno:
  - package.json con nombre @salurama/hema-[nombre]
  - tsconfig.json que extiende el tsconfig base del repo
  - src/index.ts exportando todo

Si el repo no tiene pnpm workspaces todavía:
  - Crea pnpm-workspace.yaml
  - Actualiza package.json raíz con scripts:
    test:hema, test:hema:rls, test:hema:e2e, db:hema:reset, db:hema:seed

Si ya existe pnpm workspaces:
  - Solo agrega los tres paquetes nuevos

Configura vitest para los paquetes hema-*.
NO toques ningún test existente.

Entrega: lista de archivos creados con su propósito.
```

---

### SESIÓN 2 — Migraciones de base de datos

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 2.

Crea las migraciones en supabase/migrations/ con timestamp actual.
ANTES de crear cada migración, muéstramela para que yo la apruebe.

Orden de creación:
1. [ts]_hema_schema.sql        → CREATE SCHEMA hema; GRANT USAGE...
2. [ts]_hema_tenants.sql       → tabla hema.tenants
3. [ts]_hema_users.sql         → tabla hema.users (referencia auth.users)
                                  IMPORTANTE: referencia también a la tabla de
                                  perfiles existente de Salurama ([nombre de Sesión 0])
4. [ts]_hema_patients.sql      → tabla + constraint CURP único por tenant
5. [ts]_hema_measurements.sql  → columnas BSA generadas (Mosteller + DuBois)
6. [ts]_hema_diagnoses.sql     → tabla CIE-10
7. [ts]_hema_protocols.sql     → protocolos + protocol_diagnoses + protocol_drugs
8. [ts]_hema_drugs.sql         → catálogo de fármacos
9. [ts]_hema_lab_panels.sql    → lab_panels + lab_values
10. [ts]_hema_orders.sql       → orders + order_drugs + cumulative_doses
11. [ts]_hema_audit.sql        → audit_log + reglas NO UPDATE/DELETE + audit_anchors
12. [ts]_hema_signatures.sql   → tabla signatures
13. [ts]_hema_rls.sql          → RLS policies en TODAS las tablas hema.*
14. [ts]_hema_triggers.sql     → audit triggers en cada tabla clínica
                                  + trigger validate_order_before_insert
15. [ts]_hema_seed_cie10.sql   → INSERT de ~180 códigos CIE-10 relevantes

Verificación: 66 kg / 160 cm → bsa_mosteller = 1.71 m²
Incluye este caso como comentario en la migración de measurements.

Después de las migraciones, crea:
tests/hema/rls/cross-tenant.test.ts
  → Prueba ≥5 intentos de acceso cross-tenant en cada tabla clínica
  → Todos deben fallar con error de RLS
  → Usa dos usuarios de tenants distintos
```

---

### SESIÓN 3 — Calculadoras clínicas

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 3.

En packages/hema-shared/src/ crea:

1. types.ts
   → Tipos Zod: Patient, Order, OrderInput, ValidationResult,
     LabPanel, LabValue, Drug, Protocol, ProtocolDrug
   → Exporta también los tipos TypeScript inferidos de cada schema Zod
   → Sin 'any' en ningún tipo

2. bsa.ts
   → calculateBSAMosteller(weight_kg: number, height_cm: number): number
   → calculateBSADuBois(weight_kg: number, height_cm: number): number
   → Prueba: 66 kg / 160 cm → Mosteller = 1.71 m²
   → Throws si fuera del rango fisiológico (20–250 kg, 100–220 cm)

3. ckd-epi.ts
   → calculateCKDEPI2021(creatinine, age, sex): number  (mL/min/1.73m²)
   → calculateCockcroftGault(creatinine, age, sex, weight): number  (mL/min)
   → Prueba: creatinina 2.5 mg/dL, hombre, 60a, 70 kg → CrCl ≈ 28 mL/min

4. cie10.ts
   → searchDiagnosis(query: string, category?: string): Diagnosis[]
   → Búsqueda fuzzy contra el catálogo sembrado en la migración
   → Filtrable por: 'mieloma','linfoma','leucemia','mds','mpn','otro'

Mínimo 3 tests por función en packages/hema-shared/src/__tests__/.
Los tests deben correr con: pnpm --filter @salurama/hema-shared test
```

---

### SESIÓN 4 — JWT + acceso al módulo

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 4.

1. Auth Hook (Supabase Edge Function):
   Crea supabase/functions/hema-auth-hook/index.ts
   → Se ejecuta post-login
   → Lee la tabla de suscripciones de Salurama ([nombre de Sesión 0])
   → Agrega al JWT: { modules: ['hema'], tenant_id: uuid }
   → Si el usuario no tiene Plan Clínico: modules: []
   → NO modifica claims existentes del JWT de Salurama

2. Middleware (extender el existente):
   Abre middleware.ts existente
   MUÉSTRAME el bloque que vas a agregar antes de editarlo
   Agrega SOLO:
   → Si pathname empieza con '/hema' → verifica modules.includes('hema')
   → Si no tiene el claim → redirect('/planes?upgrade=hema')
   → No toques ninguna lógica existente

3. Layout del módulo:
   Crea app/hema/layout.tsx
   → Verifica el claim 'hema' (segunda capa de seguridad en servidor)
   → Lee el perfil del médico desde la tabla existente de Salurama
   → Reutiliza el navbar/sidebar existente de Salurama
   → Agrega el disclaimer NOM-004 en footer de cada página:
     "Herramienta de soporte a la decisión clínica.
      El médico tratante es el único responsable de la prescripción."

4. Dashboard del módulo:
   Crea app/hema/page.tsx
   → Lee /mnt/skills/public/frontend-design/SKILL.md primero
   → Muestra: órdenes del día, pacientes activos, alertas pendientes
   → Mobile-first: diseñado para 375px primero
   → Estética: "Precisión médica con calma humana" (ver Sección II)
```

---

### SESIÓN 5 — Módulo de pacientes

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 5.
Lee /mnt/skills/public/frontend-design/SKILL.md antes de escribir UI.

Crea el módulo completo de pacientes:

A) app/hema/pacientes/page.tsx — Listado
   → Búsqueda por CURP (exacta) o nombre (fuzzy)
   → Tabla/cards con: nombre, CURP enmascarado, diagnóstico activo, última orden
   → Mobile: cards apiladas. Desktop: tabla
   → Botón "Nuevo paciente" prominente

B) app/hema/pacientes/nuevo/page.tsx — Registro
   → Campo CURP con validación regex en tiempo real (18 chars, formato oficial)
   → CURP se valida contra duplicados en el tenant (RLS)
   → Campos: CURP, nombre, fecha nacimiento, sexo, NSS (opcional), alergias
   → Al guardar: redirige a medición inicial (peso/talla)
   → Validación Zod en cliente Y Server Action

C) app/hema/pacientes/[id]/page.tsx — Perfil
   → Sección: datos del paciente + diagnósticos CIE-10 activos
   → Sección: historial de mediciones con gráfica BSA vs tiempo
   → Sección: últimas 5 órdenes con estado
   → Botones: "Nueva medición", "Nueva indicación", "Subir labs"

D) app/hema/pacientes/[id]/medicion/page.tsx — Nueva medición
   → Peso (kg) + Talla (cm)
   → BSA Mosteller se calcula y muestra en tiempo real mientras escribe
   → BSA DuBois también visible (secundaria)
   → Alerta si variación >10% vs última medición

E) components/hema/BsaCard.tsx
   → Muestra BSA grande con: valor Mosteller, valor DuBois, fórmula usada
   → Indica cuál se usará para calcular dosis (Mosteller por defecto)

Mobile-first obligatorio. Touch targets ≥48px.
Reutiliza componentes UI existentes de Salurama donde sea posible.
```

---

### SESIÓN 6 — Motor de validación clínica

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 6.
Esta es la sesión más crítica. Tómate el tiempo necesario.

A) packages/hema-validator/src/engine.ts
   → Función pura: validateOrder(input: OrderInput): ValidationResult[]
   → hasUnresolvedBlocks(results: ValidationResult[]): boolean
   → Orquesta todos los archivos de reglas
   → Filtra overrides autorizados (con firma y co-firma cuando aplica)

B) packages/hema-validator/src/rules/ — 7 archivos:
   r-bsa.ts        → R-BSA-01 a R-BSA-03
   r-lab.ts        → R-LAB-01 a R-LAB-12
   r-cumulative.ts → R-CUM-01 a R-CUM-07
   r-ddi.ts        → R-DDI-01 a R-DDI-07
   r-neuropathy.ts → R-NEU-01 a R-NEU-03 (con todos los grados CTCAE v5)
   r-age.ts        → R-AGE-01 a R-AGE-03
   r-protocol.ts   → R-PRO-01 a R-PRO-06

   Cada regla es un objeto: { id, evaluate(input): ValidationResult | null }

C) Tests obligatorios en packages/hema-validator/src/__tests__/:
   Caso 1: Paciente JOB ARRIEETA, VTD, 66kg/160cm, ANC 800/µL
           → Resultado esperado: R-LAB-01 block (ANC < 1000)
   Caso 2: Paciente con doxorubicina acumulada 460 mg/m²
           → Resultado esperado: R-CUM-01 block
   Caso 3: Bortezomib en paciente con neuropatía G2 con dolor
           → Resultado esperado: R-NEU-01 warn + suggested_dose 1.0 mg/m²
   Caso 4: VCR 2.5 mg calculados en paciente de 72 años
           → Resultado esperado: R-AGE-01 block → cap 1.5 mg
   Caso 5: Override autorizado de R-LAB-11 (FEVI 48%) con co-firma
           → Resultado esperado: regla filtrada del resultado final
   Caso 6: Override de R-CUM-01 SIN co-firma
           → Resultado esperado: regla NO filtrada (requiere co-firma)
   Mínimo 3 tests por cada regla adicional.

D) Edge Function: supabase/functions/hema-orders-calculate/index.ts
   → Recibe OrderInput como body JSON
   → Llama a validateOrder()
   → Retorna { results: ValidationResult[], hasUnresolvedBlocks: boolean }
   → Rate limiting: máximo 30 req/min por user_id
   → Requiere JWT válido con modules:['hema']

E) Trigger Postgres (nueva migración [ts]_hema_trigger_validate.sql):
   → BEFORE INSERT en hema.orders
   → Llama hema-orders-calculate vía pg_net
   → Si hasUnresolvedBlocks = true → RAISE EXCEPTION con mensaje clínico
   → Este trigger NO puede desactivarse desde el cliente

Verificación final: corre todos los tests.
pnpm --filter @salurama/hema-validator test debe ser 100% verde.
```

---

### SESIÓN 7 — Catálogo de protocolos y UI admin

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 7.
Lee /mnt/skills/public/frontend-design/SKILL.md antes de UI.

A) supabase/seed/hema_protocols.json
   → Todos los ≥45 protocolos de la Sección VIII
   → Para cada uno incluye COMPLETO: protocol_drugs con dose_value,
     dose_unit, route, days_of_cycle[], max_dose_mg, infusion_minutes,
     vehicle, premed_required, sequence_order
   → Protocolos con active:false hasta aprobación del director médico

B) supabase/seed/hema_drugs.json
   → Todos los fármacos listados en Sección VIII con:
     inn, trade_names[], is_anthracycline, cumulative_max_mg_m2,
     cyp3a4_substrate, requires_hbv_screen, requires_pft

C) Script de seed: supabase/seed/hema_seed.ts
   → Lee los JSON y hace upsert en las tablas
   → Idempotente: puede correrse múltiples veces sin duplicar

D) app/hema/admin/protocolos/page.tsx
   → Lista de protocolos filtrable por: diagnóstico CIE-10, estado, especialidad
   → Badge de estado: Activo / Pendiente aprobación / Inactivo
   → Mobile-first: búsqueda en top, cards abajo

E) app/hema/admin/protocolos/[id]/page.tsx
   → Detalle del protocolo: todos los fármacos, dosis, días
   → Sección de aprobación: botón "Aprobar protocolo"
     → Solo visible si role='admin' y el usuario es médico director
     → Al aprobar: sets approved_by_medical_director + approved_at
     → Solo protocolos aprobados aparecen en el wizard de órdenes
   → Sección de referencias: DOI, PubMed, guía

   Workflow change-control:
   → Cualquier cambio a un protocolo activo crea una nueva versión
     (soft: nuevo registro con versión+1, el anterior se desactiva)
   → El cambio requiere nueva aprobación del director médico
```

---

### SESIÓN 8 — Constructor de órdenes (wizard principal)

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 8.
Lee /mnt/skills/public/frontend-design/SKILL.md antes de escribir UI.

Esta es la pantalla más importante de la app.
Objetivo de tiempo: ≤2 minutos p50 desde abrir hasta firma.
Muestra el cronómetro en pantalla durante el desarrollo para benchmark.

Crea app/hema/ordenes/nueva/page.tsx como wizard de 4 pasos.
Crea components/hema/OrderWizard/ con un componente por paso.

PASO 1 — Paciente y medición (componente: Step1Patient.tsx)
  → Búsqueda de paciente por CURP o nombre (input principal, focus automático)
  → Al seleccionar: muestra BsaCard con la medición más reciente
  → Si la medición tiene >30 días: badge amarillo "Medición desactualizada"
    con opción de registrar nueva antes de continuar
  → Muestra también: diagnóstico activo, última orden, alergias
  → Muestra los labs más recientes y su fecha

PASO 2 — Protocolo (componente: Step2Protocol.tsx)
  → Lista de protocolos FILTRADA por el código CIE-10 del diagnóstico activo
  → Solo muestra protocolos aprobados (active:true)
  → Ordenados: primero los marcados como is_preferred
  → Cada card muestra: nombre, ciclo, fármacos principales, línea de terapia
  → Selector de: número de ciclo + día del ciclo
  → Selector de labs a usar (solo panels con reviewed_by IS NOT NULL)

PASO 3 — Dosis y validación (componente: Step3Doses.tsx)
  → Tabla de fármacos con dosis calculadas automáticamente (BSA × dose/m²)
  → Cada fármaco muestra: nombre INN, dosis calculada grande, base de cálculo
  → Semáforo de validación (componente: ValidationSemaphore.tsx):
    → Verde: sin problemas
    → Amarillo: advertencias (se puede continuar con justificación)
    → Rojo: bloqueos (NO se puede continuar)
  → Llamada al validador: debounce 300ms, se ejecuta automáticamente
  → Para cada warn: checkbox "Entendido + justificación ≥30 chars"
  → Para cada block que permita override: input de justificación + selección de co-firmante
  → Para blocks sin override posible: mensaje claro del motivo clínico
  → MOBILE: semáforo arriba, tabla de dosis abajo (scroll)

PASO 4 — Confirmación y firma (componente: Step4Sign.tsx)
  → Resumen de todo: paciente, protocolo, dosis, labs usados
  → Campo "Observaciones" libre
  → Botón "Firmar indicación" (el más destacado visualmente de toda la app)
    → Tamaño: mínimo 56px de alto en mobile
    → Color: verde sólido o azul médico profundo
    → Al tocar: solicita confirmación + PIN/biométrico del médico
    → Llama a hema-orders-sign Edge Function
  → Después de firma exitosa:
    → Muestra folio, botón "Ver PDF", botón "Nueva indicación"
    → Tiempo total visible: "Indicación completada en X:XX"

Componente ValidationSemaphore.tsx:
  → Props: results: ValidationResult[]
  → Tres estados visuales completamente diferentes
  → Accesible: usa icono + color + texto (no solo color)
  → Visible bajo luz solar (contraste AAA)

Componente DoseDisplay.tsx:
  → Número grande de la dosis en mg
  → Unidad en texto más pequeño
  → Texto secundario: "calculado: X mg/m² × X.XX m²"
  → Si hay reducción: tachado del valor base + valor reducido en rojo
```

---

### SESIÓN 9 — Laboratorios y OCR

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 9.
Lee /mnt/skills/public/pdf-reading/SKILL.md
Lee /mnt/skills/public/frontend-design/SKILL.md

A) Edge Function: supabase/functions/hema-labs-ocr-ingest/index.ts
   → Recibe: { image_path: string, patient_id: uuid, collected_at: string }
   → Descarga imagen desde Storage hema-lab-images/
   → Llama a Google Cloud Document AI Form Parser
   → Guarda respuesta cruda en lab_panels.ocr_raw_json
   → Mapea campos detectados al diccionario LOINC (Sección VI del plan)
   → Crea filas en lab_values con ocr_confidence por cada analito
   → Celdas con confidence < 0.85 → flag 'needs_review' = true
   → Retorna: { panel_id, values_count, needs_review_count }

B) Diccionario LOINC (incluir en la Edge Function):
   Español → LOINC (con variantes de nombre):
   'Neutrófilos abs' / 'ANC' / 'Neut #' / 'Neutrófilos absolutos' → 751-8
   'Plaquetas' / 'PLT' / 'Trombocitos' → 777-3
   'Hemoglobina' / 'Hgb' / 'Hb' → 718-7
   'Creatinina' / 'Creat' / 'Cr' → 2160-0
   'Bilirrubina total' / 'BT' / 'Bili T' → 1975-2
   'AST' / 'TGO' / 'Aspartato aminotransferasa' → 1920-8
   'ALT' / 'TGP' / 'Alanino aminotransferasa' → 1742-6
   'Albúmina' / 'Alb' → 1751-7
   'LDH' / 'DHL' / 'Lactato deshidrogenasa' → 2532-0
   'Ácido úrico' / 'AU' / 'Urato' → 3084-1
   'FEVI' / 'FE VI' / 'Fracción de eyección' → 18043-0
   'TFG' / 'FGe' / 'eGFR' / 'Tasa filtración glomerular' → 33914-3
   'Leucocitos' / 'WBC' / 'Glóbulos blancos' → 6690-2
   'Linfocitos abs' → 731-0
   'Proteínas totales' / 'PT' → 2885-2

C) app/hema/labs/nuevo/page.tsx — Upload
   → Botón grande de cámara (mobile: activa cámara directamente)
   → Alternativa: subir PDF o foto desde galería
   → Preview de la imagen antes de enviar
   → Campo: fecha de toma de muestra (requerido)
   → Al enviar: muestra spinner + "Procesando laboratorios..."
   → Redirige automáticamente a la pantalla de revisión

D) app/hema/labs/[id]/revisar/page.tsx — Revisión
   → Layout side-by-side:
     IZQUIERDA: imagen original del laboratorio (zoom pinch-to-zoom en mobile)
     DERECHA: tabla editable de valores extraídos
   → Celdas con ocr_confidence < 0.85: fondo amarillo + ícono de advertencia
   → Cada celda es editable (el médico puede corregir)
   → Al editar: manually_edited = true
   → Botón "Confirmar todos los valores":
     → Solo habilitado cuando el médico ha revisado cada fila marcada
     → Al confirmar: sets reviewed_by + reviewed_at en lab_panels
   → En mobile: tabs "Imagen" / "Valores" (no side-by-side)
   → Resumen al final: valores críticos resaltados
     (ANC, plaquetas, creatinina, bilirrubina, FEVI)
```

---

### SESIÓN 10 — PDF y firma NOM-151

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 10.
Lee /mnt/skills/public/pdf/SKILL.md
Lee /mnt/skills/public/pdf/REFERENCE.md

A) packages/hema-pdf/src/order-template.ts
   → Usa pdf-lib (JavaScript, compatible con Deno/Edge)
   → El PDF debe cumplir NOM-004-SSA3-2012 con estos campos obligatorios:
     - Logo del tenant (configurable, fallback logo Salurama)
     - "SOLICITUD DE QUIMIOTERAPIA AMBULATORIA"
     - FOLIO: [número] · FECHA: [dd/mm/yyyy] · HORA: [hh:mm]
     - PACIENTE: [nombre] · N.S.S./CURP: [dato] · EDAD: [x] años
     - FECHA NAC: · PESO: · TALLA: · SC: [BSA m²] · SUP. CORP.: [formula]
     - DIAGNÓSTICO: [descripción] ([código CIE-10])
     - ESQUEMA: [código] · DÍA SUGERIDO: · CICLO: [n]
     - MÉDICO: [nombre completo] · MATRÍCULA: · CÉDULA: [número]
     - Tabla de medicamentos (mezclas IV): nombre · dosis · diluyente · vía · tiempo
     - Tabla de medicamentos (colectivo/oral): nombre · dosis · diluyente · vía · tiempo
     - OBSERVACIONES: [campo]
     - DISCLAIMER: "Herramienta de soporte a la decisión clínica..."
     - QR CODE: apunta a https://verify.salurama.com/v/[order_id]?h=[sha256]
     - FIRMA DEL MÉDICO (espacio + nombre + cédula)
     - "Fecha y hora de impresión: [timestamp]"
   → Función: generateOrderPDF(order: Order): Promise<Uint8Array>
   → Función: calculateSHA256(pdfBytes: Uint8Array): string

B) Edge Function: supabase/functions/hema-orders-sign/index.ts
   → Recibe: { order_id: uuid }
   → Requiere JWT con modules:['hema'] y role='medico'
   → Proceso:
     1. Lee la orden completa de Postgres
     2. Genera PDF con order-template.ts
     3. Calcula SHA-256 del PDF
     4. Sube PDF a Storage hema-order-pdfs/[tenant_id]/[order_id].pdf
     5. Llama a Mifiel API: crea documento + solicita firma FEA del médico
     6. Actualiza orders: pdf_path, pdf_sha256, nom151_constancia_id
     7. Retorna: { mifiel_sign_url: string } → redirige al médico

C) Webhook Mifiel: app/api/webhooks/mifiel/route.ts
   → Recibe callback cuando el médico firma en Mifiel
   → Verifica firma del webhook (HMAC Mifiel)
   → Descarga la constancia de conservación
   → Actualiza: hema.signatures + hema.orders.status='signed'
   → Dispara notificación Realtime al médico

D) Verificador público: app/v/[order_id]/page.tsx
   → Sin autenticación requerida (página pública)
   → Recibe: order_id + h=[sha256] en query params
   → Muestra:
     - FOLIO: [número]
     - PACIENTE: [nombre enmascarado: J** A*******] (privacidad)
     - MÉDICO: [nombre completo + cédula]
     - FECHA DE FIRMA: [timestamp]
     - DIAGNÓSTICO: [código CIE-10 + descripción]
     - ESTADO: ✓ VÁLIDO / ✗ INVÁLIDO
     - Hash SHA-256 verificado
     - Constancia NOM-151: [link al PSC]
   → Diseño austero y de máxima confianza visual

E) Integración Mifiel:
   Variables de entorno requeridas:
   MIFIEL_APP_ID=
   MIFIEL_APP_SECRET=
   MIFIEL_WEBHOOK_SECRET=
   Documenta en .env.example con comentarios de cómo obtenerlas
```

---

### SESIÓN 11 — Auditoría inmutable y bitácora

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 11.
Lee /mnt/skills/public/frontend-design/SKILL.md para la UI de auditoría.

A) Función de triggers de auditoría (nueva migración):
   → Crea función hema.audit_trigger_function()
   → Calcula SHA-256 de cada fila como: sha256(prev_hash || entity || entity_id || after_json)
   → Inserta en audit_log con prev_row_hash encadenado
   → Aplica el trigger a TODAS estas tablas:
     hema.patients, hema.patient_measurements, hema.patient_diagnoses,
     hema.orders, hema.order_drugs, hema.cumulative_doses,
     hema.lab_panels, hema.lab_values, hema.signatures
   → El trigger registra: action, entity, entity_id, before_json, after_json,
     ip_address (desde current_setting), user_id (desde auth.uid())

B) Edge Function cron: supabase/functions/hema-audit-anchor/index.ts
   → Se ejecuta diariamente a las 00:01 UTC
   → Lee el último row_hash de hema.audit_log del día anterior
   → Escribe en S3/bucket-object-lock: anchors/YYYY-MM-DD.sha256.txt
   → Inserta en hema.audit_anchors: anchor_date, row_hash, s3_path
   → Si falla: envia alerta por email al admin del tenant

C) app/hema/admin/auditoria/page.tsx
   → Tabla de audit_log con filtros:
     - Rango de fechas
     - Usuario (desplegable)
     - Entidad (patients / orders / labs / signatures)
     - Acción (INSERT / UPDATE / DELETE)
   → Cada fila expandible: muestra before_json / after_json en diff visual
   → Botón "Verificar integridad de cadena":
     → Compara la cadena de hashes locales vs anchors en S3
     → Muestra: "Cadena íntegra ✓" o "Brecha detectada en [fecha] ✗"
   → Export CSV del período seleccionado
   → Mobile: cards colapsables en lugar de tabla
```

---

### SESIÓN 12 — Hardening final y criterios de aceptación

**Instrucción para Claude Code:**
```
Lee HEMA_PLAN.md completo. Ejecuta Sesión 12.

Ejecuta cada punto y muéstrame el resultado antes de continuar con el siguiente.

1. TEST RLS — Cross-tenant
   → pnpm test:hema:rls
   → Deben ejecutarse ≥10 intentos de acceso cross-tenant por tabla clínica
   → Resultado esperado: todos fallan con error de RLS
   → Si alguno pasa: es un bug de seguridad crítico, detener todo

2. TESTS DE VALIDACIÓN CLÍNICA
   → pnpm --filter @salurama/hema-validator test
   → Resultado esperado: 100% verde, ≥3 tests por regla
   → Cobertura mínima: 80%

3. TYPESCRIPT
   → npx tsc --noEmit
   → Resultado esperado: 0 errores, 0 warnings
   → Si hay errores: corregirlos antes de continuar

4. TEST E2E — Flujo completo (Playwright)
   Crea tests/hema/e2e/order-flow.spec.ts con este flujo:
   → Login con usuario médico de prueba
   → Navegar a /hema
   → Ir a /hema/pacientes/nuevo → crear paciente con CURP válido
   → Subir imagen de labs (fixture) → confirmar todos los valores
   → Ir a /hema/ordenes/nueva
   → Seleccionar el paciente creado
   → Seleccionar protocolo VRd
   → Verificar que BSA = 1.71 m² (paciente de prueba: 66kg/160cm)
   → Verificar que dosis de bortezomib = 2.22 mg
   → Completar Paso 3 sin warnings bloqueantes
   → Completar firma (mock de Mifiel en test)
   → Verificar que la orden aparece en /hema/ordenes con estado 'signed'
   → Ir a /v/[order_id] y verificar que muestra VÁLIDO
   → Medir tiempo total: debe ser ≤3 minutos

5. LIGHTHOUSE
   → Ejecutar en /hema/ordenes/nueva
   → Accessibility: ≥95
   → Performance: ≥80 (mobile)
   → Best Practices: ≥95

6. SEGURIDAD
   → git grep -ri "secret\|password\|api_key\|private_key" -- '*.ts' '*.tsx' '*.js'
   → Resultado esperado: solo referencias a process.env.* o variables de entorno
   → Sin credenciales hardcodeadas

7. PHI EN LOGS
   → git grep -ri "console.log\|console.error" -- 'app/hema/**' 'packages/hema-*/**'
   → Verificar que ningún console incluye: nombre, CURP, NSS, dosis, diagnóstico

8. RATE LIMITING
   → Verificar que cada Edge Function tiene el header:
     X-RateLimit-Limit y retorna 429 al exceder el límite

9. VARIABLES DE ENTORNO
   → Verificar que .env.example tiene TODAS las variables nuevas documentadas:
     GOOGLE_DOCUMENT_AI_KEY, MIFIEL_APP_ID, MIFIEL_APP_SECRET,
     MIFIEL_WEBHOOK_SECRET, S3_AUDIT_BUCKET, S3_AUDIT_REGION

10. REPORTE FINAL
    Genera un reporte en HEMA_BUILD_REPORT.md con:
    - Lista de todos los archivos creados (con propósito)
    - Cobertura de tests por paquete
    - Tiempo promedio del flujo e2e
    - Reglas de validación activas (lista completa)
    - Variables de entorno requeridas
    - Pasos manuales que quedan pendientes (Mifiel, Google Doc AI, S3)
    - Checklist regulatorio: qué está implementado vs qué es proceso externo
```

---

## SECCIÓN X — CUMPLIMIENTO REGULATORIO MÉXICO

### COFEPRIS — SaMD Clase II
- Clasificación bajo Suplemento Farmacopea 5a ed., Regla 16, Apéndice II (vigente 10 julio 2023)
- Requiere: dossier técnico + QMS ISO 13485 + ISO 14971 + IEC 62304 clase B + IEC 62366
- Ruta: equivalencia FDA 510(k) → luego equivalencia COFEPRIS
- **La firma del médico es SIEMPRE obligatoria.** El sistema nunca actúa de forma autónoma.

### NOM-024-SSA3-2012
- Confidencialidad: RLS + cifrado pgsodium en columnas PHI
- Integridad: audit_log inmutable + cadena SHA-256 + anchor diario S3
- Catálogos nacionales: CIE-10, CURP, CLUES, cédula profesional SEP

### NOM-151-SCFI-2016 — Lo que el código implementa
- Generación de PDF con SHA-256
- Integración con Mifiel (PSC acreditado ante Secretaría de Economía)
- Constancia de conservación = sello RFC 3161 + SHA-256 + listas de revocación
- QR en PDF apunta a: `https://verify.salurama.com/v/[order_id]?h=[sha256]`
- **NOTA:** El "PDF + QR" solo no es suficiente. La constancia Mifiel es el documento legal.

### NOM-004-SSA3-2012
El PDF incluye todos los campos obligatorios del expediente clínico electrónico.

### NOM-220-SSA1-2016
- Workflow de reporte de eventos adversos: pendiente implementación post-MVP
- Los datos fuente se retienen ≥5 años por la auditoría inmutable

### LFPDPPP
- Aviso de privacidad integral + simplificado visible desde el módulo
- Derechos ARCO: formulario en /hema/privacidad
- Notificación de brecha a INAI en ≤72h (proceso operativo, no técnico)

---

## SECCIÓN XI — CRONOGRAMA

| Semana | Claude Code (Build) | Acciones manuales paralelas |
|--------|--------------------|-----------------------------|
| 1 | Sesión 0 + 1 | Contratar MRH COFEPRIS · Abrir cuenta Mifiel developer |
| 2 | Sesión 2 (DB) | ISO 13485 gap analysis · Abrir cuenta Google Document AI |
| 3 | Sesión 3 (calculadoras) | IEC 62304 plan · Aviso de privacidad |
| 4 | Sesión 4 (JWT + acceso) | Reclutamiento médico director |
| 5 | Sesión 5 (pacientes) | Configurar S3 object-lock para anchors |
| 6 | Sesión 6 (validador) | Submit pre-evaluación DGIS NOM-024 |
| 7 | Sesión 7 (protocolos) | Alpha con datos sintéticos |
| 8 | Sesión 8 (order builder) | Primer pen-test externo (OWASP ZAP) |
| 9 | Sesión 9 (labs + OCR) | Calibración OCR con 20 labs reales anonimizados |
| 10 | Sesión 10 (PDF + firma) | Integración Mifiel producción |
| 11 | Sesión 11 (auditoría) | Workflow NOM-220 · Evaluación clínica doc |
| 12 | Sesión 12 (hardening) | Submit Registro Sanitario Clase II |
| 13–14 | Deploy beta: 1 hospital · 3 médicos · 50 pacientes | IRB + consentimientos |
| 15–16 | Beta activa paralelo a IMSSys | Post-market surveillance activo |
| 17–36 | Oncología · Reumatología · Neurología | Registro Sanitario en mano |

**MVP completo = Semana 14**

**Criterios de MVP:**
- ≤2 min p50 por indicación completa
- ≥45 protocolos activos y aprobados
- ≥40 reglas de validación operativas
- NOM-151 end-to-end verificable (PDF → QR → /v/[id] → VÁLIDO)
- 0 hallazgos críticos en pen-test
- 0 leaks cross-tenant en suite RLS
- 100% de escrituras clínicas en audit_log

---

*Fin del plan — versión 2.0 — Mayo 2026*
*Clasificación: Confidencial — Salurama S.A.S.*
*Este archivo es la única fuente de verdad para Claude Code.*
*Actualizar la versión al hacer cambios significativos.*
