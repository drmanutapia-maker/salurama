-- HEMA Módulo: Auditoría inmutable + anchors diarios
-- Afecta schema: hema
-- Reversión: DROP TABLE hema.audit_anchors CASCADE;
--            DROP TABLE hema.audit_log CASCADE;

CREATE TABLE IF NOT EXISTS hema.audit_log (
  id            bigserial   PRIMARY KEY,
  tenant_id     uuid        NOT NULL,
  user_id       uuid,
  action        text        NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  entity        text        NOT NULL,
  entity_id     uuid,
  before_json   jsonb,
  after_json    jsonb,
  ip_address    inet,
  user_agent    text,
  prev_row_hash text,
  row_hash      text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE hema.audit_log IS
  'Bitácora inmutable de todos los cambios en tablas clínicas. '
  'Las reglas NO UPDATE / NO DELETE garantizan que ningún rol puede '
  'modificar ni borrar registros de auditoría, incluyendo service_role.';

COMMENT ON COLUMN hema.audit_log.prev_row_hash IS
  'Hash SHA-256 de la fila anterior en la misma entidad. '
  'Encadenado: romper la cadena detecta manipulación retroactiva.';

COMMENT ON COLUMN hema.audit_log.row_hash IS
  'SHA-256 de: prev_row_hash || action || entity || entity_id::text || after_json::text';

-- Inmutabilidad total: ni UPDATE ni DELETE son posibles en este log
CREATE RULE audit_no_update AS ON UPDATE TO hema.audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO hema.audit_log DO INSTEAD NOTHING;

-- ─────────────────────────────────────────
-- Anchors diarios en S3 object-lock
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hema.audit_anchors (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_date  date  NOT NULL UNIQUE,
  row_hash     text  NOT NULL,
  s3_path      text  NOT NULL,
  created_at   timestamptz DEFAULT now()
);

COMMENT ON TABLE hema.audit_anchors IS
  'Registro del último hash diario anclado en S3 object-lock. '
  'La Edge Function hema-audit-anchor escribe aquí cada día a las 00:01 UTC. '
  'Permite verificar integridad de la cadena de hashes offline.';

COMMENT ON COLUMN hema.audit_anchors.s3_path IS
  'Path en S3: anchors/YYYY-MM-DD.sha256.txt (bucket con object-lock COMPLIANCE).';
