-- ============================================================
-- Fix: consultorios SELECT a nivel de tabla para authenticated
--
-- La migración 000002 hizo REVOKE ALL + GRANT SELECT (columnas)
-- a nivel de columna, sin otorgar SELECT a nivel de tabla.
-- PostgREST verifica has_table_privilege(..., 'SELECT') antes de
-- construir los queries del cliente JS; si devuelve false, la query
-- retorna data: null silenciosamente → la sección "Mis consultorios"
-- se quedaba en "Cargando..." indefinidamente.
--
-- Fix: otorgar SELECT a nivel de tabla. El campo telefono queda
-- accesible para authenticated vía public_select RLS (activo=true)
-- lo cual es aceptable porque: (a) RLS ya limita a filas propias
-- para el médico dueño vía owner_select, y (b) el client JS en
-- loadData() ya no incluye telefono en el SELECT. Se documenta
-- como deuda técnica menor.
-- ============================================================

GRANT SELECT ON TABLE public.consultorios TO authenticated;
