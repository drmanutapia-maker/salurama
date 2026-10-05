-- ============================================================
-- Fase 3 / Subfase 1: tabla consultorios
-- Separa de `doctors` los datos de ubicación, teléfono y horario del
-- consultorio, agrega citas.consultorio_id, protege el teléfono en el
-- servidor (RLS + permisos por columna + funciones SECURITY DEFINER),
-- reescribe nearby_doctors y corrige el cálculo de rating en DELETE.
-- ============================================================

-- ============================================================
-- TABLA: consultorios
-- ============================================================
CREATE TABLE public.consultorios (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  -- Relación con el médico
  doctor_id                 uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,

  -- Identidad
  nombre                    text,
  tipo                      text NOT NULL DEFAULT 'consultorio'
                              CONSTRAINT consultorios_tipo_check
                              CHECK (tipo IN ('consultorio', 'hospital')),

  -- Dirección estructurada
  street                    text,
  ext_number                text,
  int_number                text,
  floor                     text,
  colonia                   text,
  ciudad                    text,
  estado                    text,
  cp                        text,

  -- Dirección compuesta (display y SEO)
  formatted_address         text,

  -- Coordenadas
  lat                       numeric,
  lng                       numeric,

  -- Teléfono (nunca expuesto público directo — ver permisos abajo)
  telefono                  text,
  telefono_visible          boolean NOT NULL DEFAULT false,

  -- Horario
  horario                   jsonb NOT NULL DEFAULT '{
    "lunes":     {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "martes":    {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "miercoles": {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "jueves":    {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "viernes":   {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "sabado":    {"activo": false, "inicio": "09:00", "fin": "14:00"},
    "domingo":   {"activo": false, "inicio": "09:00", "fin": "14:00"}
  }'::jsonb,

  -- Accesibilidad
  wheelchair_accessible     boolean NOT NULL DEFAULT false,
  has_elevator              boolean NOT NULL DEFAULT false,
  has_parking               boolean NOT NULL DEFAULT false,
  public_transport_nearby   boolean NOT NULL DEFAULT false,

  -- Control
  es_principal              boolean NOT NULL DEFAULT true,
  activo                    boolean NOT NULL DEFAULT true,
  orden                     integer NOT NULL DEFAULT 0
);

-- Índices
CREATE INDEX idx_consultorios_doctor_id
  ON public.consultorios(doctor_id);

CREATE INDEX idx_consultorios_location
  ON public.consultorios(lat, lng)
  WHERE lat IS NOT NULL;

CREATE INDEX idx_consultorios_activo
  ON public.consultorios(doctor_id, activo);

-- Solo un consultorio principal por médico
CREATE UNIQUE INDEX idx_consultorios_principal
  ON public.consultorios(doctor_id)
  WHERE es_principal = true;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_consultorios_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_consultorios_updated_at
  BEFORE UPDATE ON public.consultorios
  FOR EACH ROW EXECUTE FUNCTION public.update_consultorios_updated_at();

-- ============================================================
-- RLS de consultorios (teléfono protegido en servidor)
-- ============================================================
ALTER TABLE public.consultorios ENABLE ROW LEVEL SECURITY;

-- Lectura pública de consultorios activos (las columnas visibles las
-- limita el GRANT por columna de más abajo: `telefono` queda fuera)
CREATE POLICY "consultorios_public_select"
  ON public.consultorios FOR SELECT
  TO anon, authenticated
  USING (activo = true);

-- El médico dueño puede leer todos sus consultorios (incluso inactivos)
CREATE POLICY "consultorios_owner_select"
  ON public.consultorios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = doctor_id
        AND d.user_id = auth.uid()
    )
  );

-- El médico dueño puede insertar, actualizar y borrar los suyos
CREATE POLICY "consultorios_owner_write"
  ON public.consultorios FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = doctor_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = doctor_id
        AND d.user_id = auth.uid()
    )
  );

-- Admins pueden todo
CREATE POLICY "consultorios_admin_all"
  ON public.consultorios FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

-- Permisos por columna para el rol anon: una política RLS filtra FILAS, no
-- columnas, así que sin esto `telefono` seguiría legible por la API pública
-- (Supabase otorga ALL sobre tablas nuevas a anon). Se quita todo y se
-- otorga SELECT solo sobre las columnas públicas. Consecuencia: anon no
-- puede usar `select=*` sobre consultorios (debe listar columnas). Si se
-- agregan columnas públicas nuevas, hay que otorgarlas aquí también.
REVOKE ALL ON TABLE public.consultorios FROM anon;
GRANT SELECT (
  id, created_at, updated_at, doctor_id, nombre, tipo,
  street, ext_number, int_number, floor, colonia, ciudad, estado, cp,
  formatted_address, lat, lng, telefono_visible, horario,
  wheelchair_accessible, has_elevator, has_parking, public_transport_nearby,
  es_principal, activo, orden
) ON public.consultorios TO anon;

-- Función pública para obtener el teléfono de un consultorio.
-- Devuelve el número solo si telefono_visible = true, NULL en caso contrario.
-- SECURITY DEFINER para poder leer la columna que anon no puede leer directo.
CREATE OR REPLACE FUNCTION public.get_consultorio_telefono(p_consultorio_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_telefono text;
  v_visible  boolean;
BEGIN
  SELECT telefono, telefono_visible
  INTO v_telefono, v_visible
  FROM public.consultorios
  WHERE id = p_consultorio_id
    AND activo = true;

  IF v_visible = true THEN
    RETURN v_telefono;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_consultorio_telefono(uuid) TO anon, authenticated;

-- ============================================================
-- doctors: misma función para el teléfono del consultorio principal
-- (mientras doctors.clinic_phone no se haya migrado completamente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_doctor_clinic_phone(p_doctor_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone   text;
  v_visible boolean;
BEGIN
  SELECT clinic_phone, clinic_phone_visible
  INTO v_phone, v_visible
  FROM public.doctors
  WHERE id = p_doctor_id
    AND is_active = true;

  IF v_visible = true THEN
    RETURN v_phone;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_doctor_clinic_phone(uuid) TO anon, authenticated;

-- ============================================================
-- Migrar datos de doctors a consultorios (uno por médico activo)
-- ============================================================
INSERT INTO public.consultorios (
  doctor_id,
  nombre,
  tipo,
  street,
  ext_number,
  int_number,
  floor,
  colonia,
  ciudad,
  estado,
  cp,
  formatted_address,
  lat,
  lng,
  telefono,
  telefono_visible,
  horario,
  wheelchair_accessible,
  has_elevator,
  has_parking,
  public_transport_nearby,
  es_principal,
  activo,
  orden
)
SELECT
  id,
  COALESCE(
    NULLIF(TRIM(clinic_name), ''),
    'Consultorio de ' || COALESCE(NULLIF(TRIM(display_name), ''), TRIM(full_name))
  ),
  COALESCE(NULLIF(TRIM(clinic_type), ''), 'consultorio'),
  street,
  ext_number,
  int_number,
  floor,
  colonia,
  ciudad,
  estado,
  cp,
  COALESCE(clinic_formatted_address, clinic_address),
  clinic_lat,
  clinic_lng,
  clinic_phone,
  COALESCE(clinic_phone_visible, false),
  COALESCE(horario, '{
    "lunes":     {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "martes":    {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "miercoles": {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "jueves":    {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "viernes":   {"activo": true,  "inicio": "09:00", "fin": "18:00"},
    "sabado":    {"activo": false, "inicio": "09:00", "fin": "14:00"},
    "domingo":   {"activo": false, "inicio": "09:00", "fin": "14:00"}
  }'::jsonb),
  COALESCE(wheelchair_accessible, false),
  COALESCE(has_elevator, false),
  COALESCE(has_parking, false),
  COALESCE(public_transport_nearby, false),
  true,
  true,
  0
FROM public.doctors
WHERE is_active = true;

-- Si la migración no dejó exactamente un consultorio por médico activo,
-- aborta (la migración es transaccional: no queda nada a medias).
DO $$
DECLARE
  v_medicos      integer;
  v_consultorios integer;
BEGIN
  SELECT COUNT(*) INTO v_medicos FROM public.doctors WHERE is_active = true;
  SELECT COUNT(*) INTO v_consultorios FROM public.consultorios;
  IF v_medicos <> v_consultorios THEN
    RAISE EXCEPTION 'Migración a consultorios inconsistente: % médicos activos, % consultorios', v_medicos, v_consultorios;
  END IF;
END;
$$;

-- ============================================================
-- citas.consultorio_id
-- Nullable a propósito: las citas históricas no tienen consultorio
-- asignado; las nuevas lo llevarán siempre.
-- ============================================================
ALTER TABLE public.citas
  ADD COLUMN consultorio_id uuid
  REFERENCES public.consultorios(id) ON DELETE SET NULL;

CREATE INDEX idx_citas_consultorio_id ON public.citas(consultorio_id);

-- ============================================================
-- Ratings: update_doctor_rating se disparaba también en DELETE pero usaba
-- NEW.doctor_id (NULL al borrar), así que nunca recalculaba. Ahora usa
-- OLD en DELETE y deja rating_avg en 0 (no NULL) cuando no quedan reseñas.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_doctor_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_doctor_id uuid := COALESCE(NEW.doctor_id, OLD.doctor_id);
BEGIN
  UPDATE public.doctors
  SET
    rating_avg = COALESCE((
      SELECT AVG(rating) FROM public.reviews
      WHERE doctor_id = v_doctor_id AND is_visible = true
    ), 0),
    rating_count = (
      SELECT COUNT(*) FROM public.reviews
      WHERE doctor_id = v_doctor_id AND is_visible = true
    )
  WHERE id = v_doctor_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- nearby_doctors: ahora lee de consultorios. Misma firma y mismas columnas
-- de retorno. Coordenadas, ciudad y estado del consultorio principal;
-- distancia mínima entre todos los consultorios activos del médico.
-- ============================================================
CREATE OR REPLACE FUNCTION public.nearby_doctors(
  user_lat         double precision,
  user_lng         double precision,
  radius_km        integer DEFAULT 50,
  specialty_filter text DEFAULT NULL
)
RETURNS TABLE(
  id                         uuid,
  slug                       text,
  full_name                  text,
  specialty                  text,
  photo_url                  text,
  ciudad                     text,
  estado                     text,
  consultation_price_general numeric,
  years_experience           integer,
  min_patient_age            integer,
  max_patient_age            integer,
  atiende_ninos              boolean,
  clinic_lat                 numeric,
  clinic_lng                 numeric,
  hospital_affiliation       text,
  languages                  text[],
  insurance_accepted         text,
  professional_license       text,
  professional_title         text,
  rating_avg                 numeric,
  rating_count               integer,
  created_at                 timestamptz,
  distance_meters            double precision
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.slug,
    d.full_name,
    d.specialty,
    d.photo_url,
    cp.ciudad,
    cp.estado,
    d.consultation_price_general,
    d.years_experience,
    d.min_patient_age,
    d.max_patient_age,
    d.atiende_ninos,
    cp.lat AS clinic_lat,
    cp.lng AS clinic_lng,
    d.hospital_affiliation,
    d.languages,
    d.insurance_accepted,
    d.professional_license,
    d.professional_title,
    d.rating_avg,
    d.rating_count,
    d.created_at,
    ubic.distancia_min AS distance_meters
  FROM public.doctors d
  -- Consultorio principal para ciudad, estado y coordenadas de display
  JOIN public.consultorios cp
    ON cp.doctor_id = d.id
    AND cp.es_principal = true
    AND cp.activo = true
  -- Distancia mínima entre el paciente y CUALQUIER consultorio activo del médico
  CROSS JOIN LATERAL (
    SELECT MIN(
      st_distance(
        st_point(c.lng::float, c.lat::float)::geography,
        st_point(user_lng, user_lat)::geography
      )
    ) AS distancia_min
    FROM public.consultorios c
    WHERE c.doctor_id = d.id
      AND c.activo = true
      AND c.lat IS NOT NULL
      AND c.lng IS NOT NULL
  ) AS ubic
  WHERE d.is_active = true
    AND ubic.distancia_min IS NOT NULL
    AND ubic.distancia_min <= radius_km * 1000
    AND (specialty_filter IS NULL OR d.specialty ILIKE '%' || specialty_filter || '%')
  ORDER BY ubic.distancia_min ASC
  LIMIT 50;
END;
$$;
