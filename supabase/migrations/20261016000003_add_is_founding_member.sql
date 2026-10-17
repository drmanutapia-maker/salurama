-- ============================================================
-- Migración 20261016000003: columna is_founding_member en doctors
--
-- Marca a los médicos activos que se registraron durante el período
-- de fundadores de Salurama. La insignia de Esculapio mostrará el
-- círculo en dorado (#D97706) para ellos, y en verde menta (#2A9D8F)
-- para médicos verificados que se registren después.
-- ============================================================

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_founding_member boolean DEFAULT false;

-- Marca como socios fundadores a todos los médicos activos actuales,
-- excepto Ana Laura (cuenta de prueba/staff), identificada por email.
UPDATE doctors
SET is_founding_member = true
WHERE is_active = true
  AND email != 'anarmz.gallegos@hotmail.com';

-- La tabla doctors tiene permisos por columna para anon (ver
-- 20261005000004_doctors_column_grants.sql). Las columnas nuevas no
-- heredan el GRANT automáticamente — hay que otorgarlo explícitamente.
GRANT SELECT (is_founding_member) ON public.doctors TO anon;
