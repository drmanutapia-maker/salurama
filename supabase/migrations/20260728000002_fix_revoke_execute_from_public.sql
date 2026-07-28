-- ═══════════════════════════════════════════════════════════════════════
-- Corrige un error en 20260728000001: REVOKE ... FROM anon, authenticated
-- no tuvo efecto porque ambas funciones tenían EXECUTE concedido a PUBLIC
-- (visible en pg_proc.proacl como "=X/postgres") — anon y authenticated
-- heredaban el permiso vía PUBLIC, no por una concesión directa. Se
-- confirmó con has_function_privilege() tras aplicar la migración
-- anterior: seguían pudiendo ejecutar ambas funciones.
-- ═══════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.buscar_paciente_medico(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.actualizar_paciente_contacto(uuid, text, text) FROM PUBLIC;
