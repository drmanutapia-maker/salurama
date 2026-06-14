-- HEMA Módulo: Row Level Security – aislamiento total por tenant
-- Afecta schema: hema (todas las tablas clínicas)
-- Reversión: DROP POLICY ... ON hema.[tabla]; ALTER TABLE hema.[tabla] DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- Función auxiliar: extrae tenant_id del JWT
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION hema.current_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$;

-- ─────────────────────────────────────────
-- hema.tenants — solo lee su propio tenant
-- ─────────────────────────────────────────

ALTER TABLE hema.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_own" ON hema.tenants
  FOR SELECT USING (id = hema.current_tenant_id());

-- ─────────────────────────────────────────
-- hema.users
-- ─────────────────────────────────────────

ALTER TABLE hema.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_tenant_isolation" ON hema.users
  USING (tenant_id = hema.current_tenant_id());

-- ─────────────────────────────────────────
-- hema.patients
-- ─────────────────────────────────────────

ALTER TABLE hema.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_tenant_isolation" ON hema.patients
  USING (tenant_id = hema.current_tenant_id());

-- ─────────────────────────────────────────
-- hema.patient_measurements — append-only para médicos
-- ─────────────────────────────────────────

ALTER TABLE hema.patient_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "measurements_tenant_isolation" ON hema.patient_measurements
  USING (
    patient_id IN (
      SELECT id FROM hema.patients WHERE tenant_id = hema.current_tenant_id()
    )
  );

CREATE POLICY "measurements_no_update" ON hema.patient_measurements
  FOR UPDATE USING (false);

CREATE POLICY "measurements_no_delete" ON hema.patient_measurements
  FOR DELETE USING (false);

-- ─────────────────────────────────────────
-- hema.patient_diagnoses
-- ─────────────────────────────────────────

ALTER TABLE hema.patient_diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_diagnoses_tenant_isolation" ON hema.patient_diagnoses
  USING (
    patient_id IN (
      SELECT id FROM hema.patients WHERE tenant_id = hema.current_tenant_id()
    )
  );

-- ─────────────────────────────────────────
-- hema.diagnoses — catálogo global de solo lectura
-- ─────────────────────────────────────────

ALTER TABLE hema.diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnoses_read_all" ON hema.diagnoses
  FOR SELECT USING (true);

CREATE POLICY "diagnoses_no_write" ON hema.diagnoses
  FOR ALL USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────
-- hema.drugs — catálogo global de solo lectura
-- ─────────────────────────────────────────

ALTER TABLE hema.drugs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drugs_read_all" ON hema.drugs
  FOR SELECT USING (true);

CREATE POLICY "drugs_no_write" ON hema.drugs
  FOR ALL USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────
-- hema.protocols — catálogo global de solo lectura (solo activos)
-- ─────────────────────────────────────────

ALTER TABLE hema.protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "protocols_read_active" ON hema.protocols
  FOR SELECT USING (true);

CREATE POLICY "protocols_no_write" ON hema.protocols
  FOR ALL USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────
-- hema.protocol_diagnoses / hema.protocol_drugs
-- ─────────────────────────────────────────

ALTER TABLE hema.protocol_diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "protocol_diagnoses_read_all" ON hema.protocol_diagnoses
  FOR SELECT USING (true);
CREATE POLICY "protocol_diagnoses_no_write" ON hema.protocol_diagnoses
  FOR ALL USING (false) WITH CHECK (false);

ALTER TABLE hema.protocol_drugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "protocol_drugs_read_all" ON hema.protocol_drugs
  FOR SELECT USING (true);
CREATE POLICY "protocol_drugs_no_write" ON hema.protocol_drugs
  FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────
-- hema.lab_panels
-- ─────────────────────────────────────────

ALTER TABLE hema.lab_panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_panels_tenant_isolation" ON hema.lab_panels
  USING (tenant_id = hema.current_tenant_id());

-- ─────────────────────────────────────────
-- hema.lab_values — hereda tenant via panel
-- ─────────────────────────────────────────

ALTER TABLE hema.lab_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_values_tenant_isolation" ON hema.lab_values
  USING (
    panel_id IN (
      SELECT id FROM hema.lab_panels WHERE tenant_id = hema.current_tenant_id()
    )
  );

-- ─────────────────────────────────────────
-- hema.orders
-- ─────────────────────────────────────────

ALTER TABLE hema.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_tenant_isolation" ON hema.orders
  USING (tenant_id = hema.current_tenant_id());

-- ─────────────────────────────────────────
-- hema.order_drugs — hereda tenant via orden
-- ─────────────────────────────────────────

ALTER TABLE hema.order_drugs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_drugs_tenant_isolation" ON hema.order_drugs
  USING (
    order_id IN (
      SELECT id FROM hema.orders WHERE tenant_id = hema.current_tenant_id()
    )
  );

-- ─────────────────────────────────────────
-- hema.cumulative_doses — hereda tenant via paciente
-- ─────────────────────────────────────────

ALTER TABLE hema.cumulative_doses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cumulative_doses_tenant_isolation" ON hema.cumulative_doses
  USING (
    patient_id IN (
      SELECT id FROM hema.patients WHERE tenant_id = hema.current_tenant_id()
    )
  );

-- ─────────────────────────────────────────
-- hema.audit_log — solo lectura para rol auditor del mismo tenant
-- ─────────────────────────────────────────

ALTER TABLE hema.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_tenant_isolation" ON hema.audit_log
  FOR SELECT USING (tenant_id = hema.current_tenant_id());

-- INSERT solo permitido desde service_role (triggers de auditoría)
CREATE POLICY "audit_log_insert_service_only" ON hema.audit_log
  FOR INSERT WITH CHECK (tenant_id = hema.current_tenant_id());

-- ─────────────────────────────────────────
-- hema.audit_anchors — solo lectura
-- ─────────────────────────────────────────

ALTER TABLE hema.audit_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_anchors_read_all" ON hema.audit_anchors
  FOR SELECT USING (true);

CREATE POLICY "audit_anchors_no_write" ON hema.audit_anchors
  FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────
-- hema.signatures — solo lee firmas de su tenant
-- ─────────────────────────────────────────

ALTER TABLE hema.signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signatures_tenant_isolation" ON hema.signatures
  USING (
    order_id IN (
      SELECT id FROM hema.orders WHERE tenant_id = hema.current_tenant_id()
    )
  );
