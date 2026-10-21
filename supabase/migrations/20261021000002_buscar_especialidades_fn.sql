CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION buscar_especialidades(q text)
RETURNS TABLE(granular_name text)
LANGUAGE sql
STABLE
AS $$
  SELECT granular_name
  FROM specialty_granular_mapping
  WHERE is_active = true
  AND (
    unaccent(lower(granular_name)) LIKE unaccent(lower(q)) || '%'
    OR unaccent(lower(granular_name)) LIKE '% ' || unaccent(lower(q)) || '%'
  )
  ORDER BY
    CASE WHEN unaccent(lower(granular_name)) LIKE unaccent(lower(q)) || '%' THEN 0 ELSE 1 END,
    granular_name ASC
  LIMIT 50;
$$;
