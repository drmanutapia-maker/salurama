-- Extiende nearby_doctors para considerar TODAS las ubicaciones de un
-- médico (el consultorio principal de columnas planas + cada consultorio
-- adicional dentro de clinic_addresses, jsonb array -- ver
-- ConsultorioAdicional en editar-perfil/page.tsx y DoctorProfileClient.tsx),
-- no solo clinic_lat/clinic_lng. Un médico aparece si CUALQUIERA de sus
-- ubicaciones cae dentro de radius_km, y distance_meters reporta la menor
-- de todas sus distancias.
--
-- De paso corrige un bug preexistente: el ORDER BY 22 de la versión
-- anterior (20260821000001_nearby_doctors_fix.sql) apuntaba a `created_at`,
-- no a distance_meters -- contando las columnas reales del SELECT,
-- distance_meters es la posición 23, no la 22. Se cambia a ORDER BY por el
-- nombre de la columna de salida para que no vuelva a desalinearse si se
-- agregan/quitan columnas en el futuro.

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
    ubic.distancia_min AS distance_meters
  FROM doctors d
  CROSS JOIN LATERAL (
    -- Distancia mínima entre el paciente y CUALQUIERA de las ubicaciones
    -- de este médico: el consultorio principal (columnas planas) unido con
    -- cada elemento de clinic_addresses que traiga lat/lng válidos. Un
    -- médico sin ninguna ubicación geocodificada da distancia NULL aquí
    -- (se filtra en el WHERE de afuera, igual que antes).
    SELECT MIN(
      st_distance(
        st_point(u.lng, u.lat)::geography,
        st_point(user_lng, user_lat)::geography
      )
    ) AS distancia_min
    FROM (
      SELECT d.clinic_lat::float AS lat, d.clinic_lng::float AS lng
      WHERE d.clinic_lat IS NOT NULL AND d.clinic_lng IS NOT NULL

      UNION ALL

      SELECT
        (addr->>'clinic_lat')::float AS lat,
        (addr->>'clinic_lng')::float AS lng
      FROM jsonb_array_elements(COALESCE(d.clinic_addresses, '[]'::jsonb)) AS addr
      WHERE (addr->>'clinic_lat') ~ '^-?[0-9]+(\.[0-9]+)?$'
        AND (addr->>'clinic_lng') ~ '^-?[0-9]+(\.[0-9]+)?$'
    ) AS u
  ) AS ubic
  WHERE d.is_active = true
    AND ubic.distancia_min IS NOT NULL
    AND ubic.distancia_min <= radius_km * 1000
    AND (specialty_filter IS NULL OR d.specialty ILIKE '%' || specialty_filter || '%')
  ORDER BY distance_meters ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION nearby_doctors(double precision, double precision, integer, text) IS
  'Búsqueda de médicos activos dentro de radius_km (PostGIS real, no texto de ciudad). '
  'Considera TODAS las ubicaciones del médico -- clinic_lat/clinic_lng principal '
  'más cada consultorio adicional en clinic_addresses con lat/lng válidos -- y usa '
  'la distancia mínima entre ellas. Devuelve las mismas columnas que necesita la '
  'tarjeta de /buscar (ver BuscarClient.tsx) para que el chip "Cerca de mí" no deje '
  'tarjetas incompletas. ORDER BY distance_meters por nombre de columna, no posición.';
