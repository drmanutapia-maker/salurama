-- ============================================================
-- Migración 20261016000001: limpieza de columnas duplicadas en doctors
--
-- Contexto:
--   La tabla doctors acumuló columnas de ubicación, teléfono y accesibilidad
--   que ahora viven en la tabla consultorios. La migración
--   20261005000001_create_consultorios.sql hizo el backfill y
--   20261005000007_remove_bridge_trigger.sql eliminó el trigger que
--   sincronizaba doctors → consultorios. Todo el código ya lee de
--   consultorios; estas columnas en doctors son ruido muerto.
--
-- No se tocan: ciudad, estado, horario, phone, whatsapp_phone,
--   address, location_city_id (siguen siendo legítimas en doctors).
-- ============================================================

-- ── PASO 1: Normalizar orden=0 → orden=1 ────────────────────────────────────
--
-- El backfill original asignó orden=0 al consultorio principal de los 7
-- médicos existentes en ese momento. El nuevo flujo de editar-perfil usa
-- orden=1 como convencióncprincipal. Esta actualización unifica los dos
-- valores para que todos los lectores (Edge Functions, búsqueda, perfil)
-- puedan buscar por orden=1 sin distinción de origen.
-- Afecta exactamente 7 filas (los 7 médicos del backfill). Manuel ya
-- tiene orden=1,2,3 y no se ve afectado.

UPDATE consultorios SET orden = 1 WHERE orden = 0;


-- ── PASO 2: Borrar columnas de doctors ──────────────────────────────────────

-- 2a. Coordenadas heredadas (distintas de clinic_lat/lng, nunca pobladas
--     de forma consistente por el flujo actual)
ALTER TABLE doctors
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;

-- 2b. Formatos de dirección y array de consultorios adicionales legacy
--     (los adicionales viven en filas de consultorios con orden>1)
ALTER TABLE doctors
  DROP COLUMN IF EXISTS clinic_formatted_address,
  DROP COLUMN IF EXISTS clinic_addresses;

-- 2c. Coordenadas del consultorio principal (ahora en consultorios.lat/lng)
ALTER TABLE doctors
  DROP COLUMN IF EXISTS clinic_lat,
  DROP COLUMN IF EXISTS clinic_lng;

-- 2d. Nombre, tipo y dirección del consultorio principal
--     (ahora en consultorios.nombre, tipo, formatted_address)
ALTER TABLE doctors
  DROP COLUMN IF EXISTS clinic_name,
  DROP COLUMN IF EXISTS clinic_type,
  DROP COLUMN IF EXISTS clinic_address;

-- 2e. Teléfono del consultorio principal
--     (ahora en consultorios.telefono, telefono_visible)
ALTER TABLE doctors
  DROP COLUMN IF EXISTS clinic_phone,
  DROP COLUMN IF EXISTS clinic_phone_visible;

-- 2f. Campos de dirección postal del consultorio principal
--     (ahora en consultorios.street, ext_number, etc.)
ALTER TABLE doctors
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS ext_number,
  DROP COLUMN IF EXISTS int_number,
  DROP COLUMN IF EXISTS floor,
  DROP COLUMN IF EXISTS cp,
  DROP COLUMN IF EXISTS colonia;

-- 2g. Campos de accesibilidad del consultorio principal
--     (ahora en consultorios.wheelchair_accessible, etc.)
ALTER TABLE doctors
  DROP COLUMN IF EXISTS wheelchair_accessible,
  DROP COLUMN IF EXISTS has_elevator,
  DROP COLUMN IF EXISTS has_parking,
  DROP COLUMN IF EXISTS public_transport_nearby;


-- ============================================================
-- ROLLBACK — ejecutar en orden inverso para revertir esta migración
-- ============================================================

-- ROLLBACK: restaurar orden=0 para médicos del backfill original (no hay
-- forma de distinguirlos después del UPDATE sin datos adicionales; si se
-- revierte hay que decidir si todos quedan en 0 o en 1).
-- UPDATE consultorios SET orden = 0 WHERE orden = 1 AND doctor_id NOT IN (
--   SELECT id FROM doctors WHERE ...  -- criterio para identificar a Manuel
-- );

-- ROLLBACK: 2g — accesibilidad
-- ALTER TABLE doctors
--   ADD COLUMN IF NOT EXISTS wheelchair_accessible   boolean,
--   ADD COLUMN IF NOT EXISTS has_elevator            boolean,
--   ADD COLUMN IF NOT EXISTS has_parking             boolean,
--   ADD COLUMN IF NOT EXISTS public_transport_nearby boolean;

-- ROLLBACK: 2f — dirección postal
-- ALTER TABLE doctors
--   ADD COLUMN IF NOT EXISTS street     text,
--   ADD COLUMN IF NOT EXISTS ext_number text,
--   ADD COLUMN IF NOT EXISTS int_number text,
--   ADD COLUMN IF NOT EXISTS floor      text,
--   ADD COLUMN IF NOT EXISTS cp         text,
--   ADD COLUMN IF NOT EXISTS colonia    text;

-- ROLLBACK: 2e — teléfono
-- ALTER TABLE doctors
--   ADD COLUMN IF NOT EXISTS clinic_phone         text,
--   ADD COLUMN IF NOT EXISTS clinic_phone_visible boolean DEFAULT false;

-- ROLLBACK: 2d — nombre, tipo, dirección
-- ALTER TABLE doctors
--   ADD COLUMN IF NOT EXISTS clinic_name    text,
--   ADD COLUMN IF NOT EXISTS clinic_type    text,
--   ADD COLUMN IF NOT EXISTS clinic_address text;

-- ROLLBACK: 2c — coordenadas principales
-- ALTER TABLE doctors
--   ADD COLUMN IF NOT EXISTS clinic_lat numeric,
--   ADD COLUMN IF NOT EXISTS clinic_lng numeric;

-- ROLLBACK: 2b — dirección formateada y array legacy
-- ALTER TABLE doctors
--   ADD COLUMN IF NOT EXISTS clinic_formatted_address text,
--   ADD COLUMN IF NOT EXISTS clinic_addresses         jsonb;

-- ROLLBACK: 2a — coordenadas heredadas
-- ALTER TABLE doctors
--   ADD COLUMN IF NOT EXISTS latitude  double precision,
--   ADD COLUMN IF NOT EXISTS longitude double precision;
