-- HEMA Sesión 11 – Paso 2: Tabla hema.access_log para eventos de lectura
-- Los triggers de audit_log solo capturan DML (INSERT/UPDATE/DELETE).
-- Los accesos de lectura (SELECT) requieren registro explícito desde las RPCs.
-- Diseño deliberadamente más ligero que audit_log: sin hash encadenado
-- (lectura no modifica estado, encadenar no aporta valor de integridad),
-- con inmutabilidad via RULE igual que audit_log.
-- Reversión:
--   DROP TABLE hema.access_log CASCADE;

-- ── 1. Tabla ───────────────────────────────────────────────────────────────────
CREATE TABLE hema.access_log (
  id          bigserial   PRIMARY KEY,
  tenant_id   uuid        NOT NULL,
  user_id     uuid        NOT NULL,
  entity      text        NOT NULL,
  entity_id   uuid,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_address  inet,
  user_agent  text
);

COMMENT ON TABLE hema.access_log IS
  'Registro inmutable de accesos de lectura a entidades clínicas. '
  'Sin hash encadenado (lecturas no modifican estado, integridad por inmutabilidad). '
  'Complementa audit_log que solo captura DML.';

-- ── 2. Inmutabilidad ───────────────────────────────────────────────────────────
CREATE RULE access_log_no_update AS ON UPDATE TO hema.access_log DO INSTEAD NOTHING;
CREATE RULE access_log_no_delete AS ON DELETE TO hema.access_log DO INSTEAD NOTHING;

-- ── 3. Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX access_log_tenant_idx ON hema.access_log (tenant_id, accessed_at DESC);
CREATE INDEX access_log_entity_idx ON hema.access_log (entity, entity_id, accessed_at DESC);
CREATE INDEX access_log_user_idx   ON hema.access_log (user_id, accessed_at DESC);

-- ── 4. RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE hema.access_log ENABLE ROW LEVEL SECURITY;

-- Solo director_medico y admin pueden leer la bitácora de accesos
CREATE POLICY "access_log_select_admin" ON hema.access_log
  FOR SELECT USING (
    tenant_id = hema.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM hema.users
      WHERE id = auth.uid()
        AND role IN ('director_medico', 'admin')
        AND active = true
    )
  );

-- INSERT permitido a cualquier usuario autenticado del mismo tenant
-- (las RPCs que registran accesos usan auth.uid() del caller)
CREATE POLICY "access_log_insert_own_tenant" ON hema.access_log
  FOR INSERT WITH CHECK (tenant_id = hema.current_tenant_id());
