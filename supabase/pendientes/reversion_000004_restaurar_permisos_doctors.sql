-- ============================================================
-- REVERSIÓN de 20261005000004_doctors_column_grants.sql
-- Ejecutar a mano (npx supabase db query --linked -f <este archivo>) SOLO si
-- tras aplicar 000004 aparecen errores 42501 en la app. No va en
-- supabase/migrations/ a propósito: no debe aplicarse automáticamente.
--
-- Devuelve a anon y authenticated exactamente el estado previo:
--   relacl = {postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,
--             authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}
--   sin ACL por columna.
-- (REVOKE ALL sobre la tabla también elimina los permisos por columna.)
-- ============================================================
BEGIN;

REVOKE ALL ON TABLE public.doctors FROM anon, authenticated;
GRANT ALL ON TABLE public.doctors TO anon, authenticated;

-- Verificación: debe devolver true y 0 columnas con ACL propia
SELECT
  (SELECT relacl::text FROM pg_class WHERE oid = 'public.doctors'::regclass)
    = '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'
    AS relacl_restaurado,
  (SELECT count(*) FROM pg_attribute
     WHERE attrelid = 'public.doctors'::regclass AND attnum > 0 AND attacl IS NOT NULL)
    AS columnas_con_acl_propia;

COMMIT;
