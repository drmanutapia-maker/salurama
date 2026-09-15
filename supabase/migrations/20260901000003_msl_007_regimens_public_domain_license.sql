-- ============================================================
-- MIGRACIÓN MSL-007: permite fuentes de dominio público (ej.
-- prospectos FDA) en msl_regimens.source_license, además de
-- las licencias Creative Commons ya soportadas — no son lo
-- mismo legalmente (dominio público por ser obra del gobierno
-- de EE.UU., sin necesidad de atribución tipo CC), pero ambas
-- son comercialmente reutilizables sin restricción.
-- ============================================================

ALTER TABLE msl_regimens DROP CONSTRAINT msl_regimens_source_license_check;

ALTER TABLE msl_regimens ADD CONSTRAINT msl_regimens_source_license_check
  CHECK (source_license IN ('CC0', 'CC BY', 'CC BY-SA', 'CC BY-ND', 'US-federal-public-domain'));
