-- Corrige el chip "Cerca de mí" de /buscar (BuscarClient.tsx), encontrado al
-- auditar los chips de filtro tras el rediseño de la tarjeta de médico.
--
-- 1) nearby_doctors() fallaba SIEMPRE que se llamaba: referenciaba
--    d.location_city / d.location_state, columnas que no existen en
--    `doctors` (los nombres reales son ciudad/estado) -- probablemente la
--    tabla se renombró en algún momento después de escribir esta función y
--    nunca se actualizó. Como el cliente atrapa el error en un try/catch y
--    solo hace console.error, esto pasaba desapercibido: "Cerca de mí" nunca
--    reemplazaba la lista con la búsqueda real por radio en la base de
--    datos, silenciosamente se quedaba reordenando por distancia (cálculo
--    en el cliente, correcto) los mismos ~100 médicos ya traídos por
--    /buscar -- no una búsqueda real más allá de ese lote inicial.
-- 2) Aunque la llamada no fallara, el SELECT solo traía un subconjunto muy
--    angosto de columnas (ni slug, ni idiomas, ni cédula, ni calificación,
--    ni el título Dr./Dra., ni nada para "próxima cita") -- al reemplazar
--    la lista completa, esas tarjetas se verían incompletas comparadas con
--    las demás.
--
-- Reversión: restaurar la versión anterior de la función (columnas
-- location_city/location_state, selección angosta) -- ver commit anterior
-- a esta migración si hace falta el texto exacto.

-- CREATE OR REPLACE no permite cambiar la forma de un RETURNS TABLE
-- existente -- hace falta borrar la función vieja primero.
DROP FUNCTION IF EXISTS nearby_doctors(double precision, double precision, integer, text);

CREATE FUNCTION nearby_doctors(
  user_lat double precision,
  user_lng double precision,
  radius_km integer DEFAULT 50,
  specialty_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  full_name text,
  specialty text,
  photo_url text,
  ciudad text,
  estado text,
  consultation_price_general numeric,
  years_experience integer,
  min_patient_age integer,
  max_patient_age integer,
  atiende_ninos boolean,
  clinic_lat numeric,
  clinic_lng numeric,
  hospital_affiliation text,
  languages text[],
  insurance_accepted text,
  professional_license text,
  professional_title text,
  rating_avg numeric,
  rating_count integer,
  created_at timestamptz,
  distance_meters double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.slug, d.full_name, d.specialty, d.photo_url,
    d.ciudad, d.estado,
    d.consultation_price_general, d.years_experience,
    d.min_patient_age, d.max_patient_age, d.atiende_ninos,
    d.clinic_lat, d.clinic_lng,
    d.hospital_affiliation, d.languages, d.insurance_accepted, d.professional_license,
    d.professional_title, d.rating_avg, d.rating_count, d.created_at,
    st_distance(
      st_point(d.clinic_lng::float, d.clinic_lat::float)::geography,
      st_point(user_lng, user_lat)::geography
    )
  FROM doctors d
  WHERE d.is_active = true
    AND d.clinic_lat IS NOT NULL
    AND d.clinic_lng IS NOT NULL
    AND st_dwithin(
      st_point(d.clinic_lng::float, d.clinic_lat::float)::geography,
      st_point(user_lng, user_lat)::geography,
      radius_km * 1000
    )
    AND (specialty_filter IS NULL OR d.specialty ILIKE '%' || specialty_filter || '%')
  ORDER BY 22 ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION nearby_doctors(double precision, double precision, integer, text) IS
  'Búsqueda de médicos activos dentro de radius_km (PostGIS real, no texto de ciudad). '
  'Devuelve las mismas columnas que necesita la tarjeta de /buscar (ver BuscarClient.tsx) '
  'para que el chip "Cerca de mí" no deje tarjetas incompletas. distance_meters siempre '
  'como última columna (ORDER BY 22 depende de esto).';
