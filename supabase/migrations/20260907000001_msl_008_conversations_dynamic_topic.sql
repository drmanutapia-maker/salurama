-- ============================================================
-- MIGRACIÓN MSL-008: msl_conversations.specialty/pathology dejan
-- de tener un valor fijo por defecto ('hematologia' / 'mieloma_multiple').
-- MSL Virtual está diseñado para cubrir todas las especialidades médicas
-- a futuro — el piloto de hoy es solo hematología porque es la
-- especialidad de Manuel, pero el esquema no debe asumirlo. Ambos campos
-- ahora se derivan en runtime del documento mejor rankeado en la primera
-- búsqueda semántica de cada conversación (ver app/api/msl-chat/route.ts),
-- y quedan NULL si esa búsqueda no encuentra nada relevante.
-- ============================================================

ALTER TABLE msl_conversations ALTER COLUMN specialty DROP NOT NULL;
ALTER TABLE msl_conversations ALTER COLUMN specialty DROP DEFAULT;
ALTER TABLE msl_conversations ALTER COLUMN pathology DROP DEFAULT;
