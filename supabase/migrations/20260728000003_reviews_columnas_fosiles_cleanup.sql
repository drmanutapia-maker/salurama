-- ═══════════════════════════════════════════════════════════════════════
-- Limpieza de deuda técnica de la vulnerabilidad de reviews ya resuelta
-- (ver 20260727000001/002): columnas fósiles de un diseño abandonado en
-- mayo 2026, y una política de INSERT en citas que ningún flujo legítimo
-- usa (el único INSERT real pasa por service_role, que bypassa RLS).
-- Reconfirmado el 2026-07-28: 0 filas con dato real en las columnas
-- fósiles, allow_insert_citas sigue con with_check: true sin usarse.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_doctor_id_user_id_key;
ALTER TABLE reviews DROP COLUMN IF EXISTS user_id;
ALTER TABLE reviews DROP COLUMN IF EXISTS user_email;
ALTER TABLE reviews DROP COLUMN IF EXISTS email_verified;
ALTER TABLE reviews DROP COLUMN IF EXISTS verification_token;
ALTER TABLE reviews DROP COLUMN IF EXISTS verified_at;

DROP POLICY IF EXISTS allow_insert_citas ON citas;
