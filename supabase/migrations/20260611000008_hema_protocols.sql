-- HEMA Módulo: Fármacos, protocolos y sus relaciones
-- Afecta schema: hema
-- Reversión: DROP TABLE hema.protocol_drugs CASCADE;
--            DROP TABLE hema.protocol_diagnoses CASCADE;
--            DROP TABLE hema.protocols CASCADE;
--            DROP TABLE hema.drugs CASCADE;

-- ─────────────────────────────────────────
-- Catálogo de fármacos
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hema.drugs (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  inn                     text    NOT NULL UNIQUE,
  trade_names             text[]  DEFAULT '{}',
  atc_code                text,
  is_anthracycline        boolean DEFAULT false,
  is_vesicant             boolean DEFAULT false,
  cumulative_max_mg_m2    numeric,
  cyp3a4_substrate        boolean DEFAULT false,
  cyp3a4_strong_inhibitor boolean DEFAULT false,
  requires_hbv_screen     boolean DEFAULT false,
  requires_pft            boolean DEFAULT false
);

COMMENT ON TABLE hema.drugs IS
  'Catálogo de fármacos oncohematológicos con flags clínicos usados por '
  'el motor de validación. Sembrado por hema_seed_drugs.';

COMMENT ON COLUMN hema.drugs.inn IS
  'Denominación Común Internacional (DCI/INN). PK lógica del fármaco.';

COMMENT ON COLUMN hema.drugs.cumulative_max_mg_m2 IS
  'Dosis acumulada máxima en mg/m². Doxorubicina=450, Epirrubicina=900, '
  'Daunorrubicina=550, Idarrubicina=150, Mitoxantrona=140. '
  'Bleomicina usa unidades totales (400 U) – ver cumulative_max_units.';

COMMENT ON COLUMN hema.drugs.requires_hbv_screen IS
  'true en anti-CD20 (Rituximab, Obinutuzumab): requiere HBsAg + anti-HBc '
  'con fecha <90 días antes del ciclo (regla R-PRO-03).';

COMMENT ON COLUMN hema.drugs.requires_pft IS
  'true en Bleomicina: requiere pruebas de función pulmonar basales.';

-- ─────────────────────────────────────────
-- Protocolos de quimioterapia
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hema.protocols (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                         text        NOT NULL UNIQUE,
  name                         text        NOT NULL,
  cycle_length_days            int         NOT NULL,
  total_cycles                 int,
  line_of_therapy              text,
  protocol_references          jsonb,                 -- renombrado de 'references' (palabra reservada)
  active                       boolean     DEFAULT false,
  approved_by_medical_director uuid        REFERENCES hema.users(id),
  approved_at                  timestamptz,
  specialty                    text        DEFAULT 'hematologia'
);

COMMENT ON TABLE hema.protocols IS
  'Protocolos de quimioterapia. active=false hasta aprobación del director médico. '
  'Cualquier cambio a un protocolo activo debe crear un registro nuevo (control de versiones).';

COMMENT ON COLUMN hema.protocols.code IS
  'Código corto del protocolo (ej: VRD, R-CHOP-21, ABVD). Único en el catálogo.';

COMMENT ON COLUMN hema.protocols.protocol_references IS
  'Referencias bibliográficas como JSON: {doi, pubmed_id, guideline, trial_name}.';

COMMENT ON COLUMN hema.protocols.active IS
  'Solo los protocolos activos aparecen en el wizard de órdenes. '
  'Requiere aprobación explícita del director médico del tenant.';

-- ─────────────────────────────────────────
-- Relación protocolo ↔ diagnósticos CIE-10
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hema.protocol_diagnoses (
  protocol_id    uuid REFERENCES hema.protocols(id)  ON DELETE CASCADE,
  diagnosis_code text REFERENCES hema.diagnoses(code),
  is_preferred   boolean DEFAULT false,
  PRIMARY KEY (protocol_id, diagnosis_code)
);

COMMENT ON COLUMN hema.protocol_diagnoses.is_preferred IS
  'true = protocolo de primera línea para este diagnóstico. '
  'Los preferidos aparecen primero en el wizard.';

-- ─────────────────────────────────────────
-- Fármacos dentro de un protocolo (con dosis)
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hema.protocol_drugs (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id      uuid    NOT NULL REFERENCES hema.protocols(id)  ON DELETE CASCADE,
  drug_id          uuid    NOT NULL REFERENCES hema.drugs(id),
  dose_value       numeric NOT NULL,
  dose_unit        text    NOT NULL
                     CHECK (dose_unit IN ('mg/m2','mg/kg','mg','U/m2','UI','MUI')),
  route            text    NOT NULL
                     CHECK (route IN ('IV','SC','PO','IT','IM','CIV','IVP')),
  days_of_cycle    int[]   NOT NULL,
  max_dose_mg      numeric,
  infusion_minutes int,
  vehicle          text,
  premed_required  jsonb,
  sequence_order   int
);

COMMENT ON TABLE hema.protocol_drugs IS
  'Fármacos que componen un protocolo, con dosis, vía, días del ciclo '
  'y límites de cap (ej: Vincristina max_dose_mg=2 en adultos).';

COMMENT ON COLUMN hema.protocol_drugs.days_of_cycle IS
  'Días del ciclo en que se administra (ej: {1,4,8,11} para bortezomib en VRD).';

COMMENT ON COLUMN hema.protocol_drugs.max_dose_mg IS
  'Cap absoluto de dosis en mg (independiente de BSA). '
  'Vincristina adultos=2 mg, ≥70 años=1.5 mg (aplicado en motor de validación).';

COMMENT ON COLUMN hema.protocol_drugs.premed_required IS
  'Premedicaciones requeridas como JSON (ej: {"dexametasona": "8mg IV", "ondansetron": "8mg IV"}).';

COMMENT ON COLUMN hema.protocol_drugs.sequence_order IS
  'Orden de infusión dentro del ciclo (1=primero). Importante para vesicantes.';
