-- HEMA Módulo: Órdenes de quimioterapia, fármacos de orden y dosis acumuladas
-- Afecta schema: hema
-- Reversión: DROP TABLE hema.cumulative_doses CASCADE;
--            DROP TABLE hema.order_drugs CASCADE;
--            DROP TABLE hema.orders CASCADE;

-- ─────────────────────────────────────────
-- Órdenes de quimioterapia
-- ─────────────────────────────────────────

CREATE TABLE hema.orders (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES hema.tenants(id),
  patient_id            uuid        NOT NULL REFERENCES hema.patients(id),
  protocol_id           uuid        NOT NULL REFERENCES hema.protocols(id),
  diagnosis_code        text        NOT NULL REFERENCES hema.diagnoses(code),
  cycle_number          int         NOT NULL,
  day_of_cycle          int         NOT NULL,
  measurement_id        uuid        NOT NULL REFERENCES hema.patient_measurements(id),
  lab_panel_id          uuid        REFERENCES hema.lab_panels(id),
  bsa_used              numeric(4,2) NOT NULL,
  bsa_formula           text        NOT NULL
                          CHECK (bsa_formula IN ('mosteller','dubois')),
  ecog                  int         CHECK (ecog BETWEEN 0 AND 4),
  scheduled_for         date        NOT NULL,
  status                text        NOT NULL DEFAULT 'draft'
                          CHECK (status IN (
                            'draft','validated','signed',
                            'dispensed','administered','cancelled'
                          )),
  cancel_reason         text,
  signed_at             timestamptz,
  signed_by             uuid        REFERENCES hema.users(id),
  co_signed_by          uuid        REFERENCES hema.users(id),
  nom151_constancia_id  text,
  nom151_constancia_url text,
  pdf_path              text,
  pdf_sha256            text,
  qr_payload            text,
  created_at            timestamptz DEFAULT now(),
  created_by            uuid        NOT NULL REFERENCES hema.users(id),
  disclaimer            text        DEFAULT
    'Herramienta de soporte a la decisión clínica. '
    'El médico tratante es el único responsable de la prescripción.'
);

COMMENT ON TABLE hema.orders IS
  'Indicaciones de quimioterapia. Cada orden pasa por el ciclo: '
  'draft → validated → signed → dispensed → administered. '
  'El trigger hema_order_clinical_validation bloquea INSERT si hay reglas sin resolver.';

COMMENT ON COLUMN hema.orders.bsa_formula IS
  'Fórmula BSA usada para calcular las dosis de esta orden. '
  'Mosteller por defecto (ASCO 2021). Registrada para trazabilidad.';

COMMENT ON COLUMN hema.orders.co_signed_by IS
  'Segunda firma requerida para las 5 clases de override crítico: '
  'antraciclinas sobre cap acumulado, VCR+CYP3A4, FEVI<50%, '
  'ATRA/ATO+QTc prolongado, MTX con aclaramiento insuficiente.';

COMMENT ON COLUMN hema.orders.pdf_sha256 IS
  'Hash SHA-256 del PDF firmado. Verificable en /v/[order_id]?h=[sha256].';

COMMENT ON COLUMN hema.orders.disclaimer IS
  'Texto NOM-004-SSA3-2012 impreso en cada indicación. '
  'No puede eliminarse ni modificarse por el médico.';

-- ─────────────────────────────────────────
-- Fármacos de una orden específica (con dosis calculadas)
-- ─────────────────────────────────────────

CREATE TABLE hema.order_drugs (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid    NOT NULL REFERENCES hema.orders(id) ON DELETE CASCADE,
  protocol_drug_id  uuid    REFERENCES hema.protocol_drugs(id),
  drug_id           uuid    NOT NULL REFERENCES hema.drugs(id),
  computed_dose_mg  numeric NOT NULL,
  base_dose_mg      numeric NOT NULL,
  reduction_pct     numeric DEFAULT 0,
  reduction_reason  text,
  route             text    NOT NULL,
  infusion_minutes  int,
  vehicle           text,
  given_on_day      int     NOT NULL,
  warnings          jsonb   DEFAULT '[]'::jsonb,
  override_reason   text,
  pharmacy_verified boolean DEFAULT false
);

COMMENT ON TABLE hema.order_drugs IS
  'Fármacos con dosis calculadas para una orden específica. '
  'computed_dose_mg es la dosis final tras reducciones y caps aplicados.';

COMMENT ON COLUMN hema.order_drugs.computed_dose_mg IS
  'Dosis final en mg = base_dose_mg × (1 - reduction_pct/100), respetando max_dose_mg.';

COMMENT ON COLUMN hema.order_drugs.warnings IS
  'Array de ValidationResult del motor de validación. '
  'Se persiste para auditoría: qué alertas vio el médico al firmar.';

COMMENT ON COLUMN hema.order_drugs.override_reason IS
  'Justificación ≥30 chars si el médico hizo override de una regla clínica. '
  'Requerido para overrides; nulo si no hubo alertas.';

-- ─────────────────────────────────────────
-- Acumulado de dosis por paciente y fármaco
-- ─────────────────────────────────────────

CREATE TABLE hema.cumulative_doses (
  patient_id       uuid    NOT NULL REFERENCES hema.patients(id),
  drug_id          uuid    NOT NULL REFERENCES hema.drugs(id),
  cumulative_mg_m2 numeric DEFAULT 0,
  last_dose_at     timestamptz,
  PRIMARY KEY (patient_id, drug_id)
);

COMMENT ON TABLE hema.cumulative_doses IS
  'Dosis acumulada por paciente y fármaco (mg/m²). '
  'Actualizada por trigger al pasar una orden a ''administered''. '
  'Usada por R-CUM-01 a R-CUM-07 del motor de validación.';

COMMENT ON COLUMN hema.cumulative_doses.cumulative_mg_m2 IS
  'Suma histórica de dosis administradas en mg/m². '
  'Doxorubicina: bloquea en 450; con RT mediastinal previa: 350.';
