-- HEMA: Funciones RPC para módulo de pacientes (Sesión 5)
-- Todas van en public schema para compatibilidad garantizada con PostgREST
-- Usan convert_to/convert_from para MVP; sustituir por pgsodium en producción
-- Reversión: DROP FUNCTION public.hema_*

-- ─────────────────────────────────────────────────────────────────────────────
-- Listar pacientes del tenant actual con última orden y diagnóstico primario
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_list_patients(
  p_limit  int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id                     uuid,
  curp                   text,
  display_name           text,
  birth_date             date,
  sex                    text,
  allergies              text,
  nss                    text,
  created_at             timestamptz,
  last_order_date        date,
  last_order_status      text,
  last_order_protocol    text,
  primary_dx_code        text,
  primary_dx_desc        text
)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT
    p.id,
    p.curp,
    convert_from(p.full_name_encrypted, 'UTF8')   AS display_name,
    p.birth_date,
    p.sex,
    p.allergies,
    p.nss,
    p.created_at,
    lo.scheduled_for                               AS last_order_date,
    lo.status                                      AS last_order_status,
    lo.protocol_code                               AS last_order_protocol,
    pd.diagnosis_code                              AS primary_dx_code,
    dx.description_es                              AS primary_dx_desc
  FROM hema.patients p

  LEFT JOIN LATERAL (
    SELECT o.scheduled_for, o.status, pr.code AS protocol_code
    FROM   hema.orders    o
    JOIN   hema.protocols pr ON pr.id = o.protocol_id
    WHERE  o.patient_id = p.id
    ORDER  BY o.scheduled_for DESC
    LIMIT  1
  ) lo ON true

  LEFT JOIN LATERAL (
    SELECT diagnosis_code
    FROM   hema.patient_diagnoses
    WHERE  patient_id = p.id AND is_primary = true
    ORDER  BY diagnosed_at DESC
    LIMIT  1
  ) pd ON true

  LEFT JOIN hema.diagnoses dx ON dx.code = pd.diagnosis_code

  ORDER  BY p.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Detalle de un paciente con última medición
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_get_patient(p_patient_id uuid)
RETURNS TABLE (
  id                 uuid,
  curp               text,
  display_name       text,
  birth_date         date,
  sex                text,
  allergies          text,
  nss                text,
  tenant_id          uuid,
  created_at         timestamptz,
  last_measured_at   timestamptz,
  last_weight_kg     numeric,
  last_height_cm     numeric,
  last_bsa_mosteller numeric,
  last_bsa_dubois    numeric
)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT
    p.id,
    p.curp,
    convert_from(p.full_name_encrypted, 'UTF8') AS display_name,
    p.birth_date,
    p.sex,
    p.allergies,
    p.nss,
    p.tenant_id,
    p.created_at,
    m.measured_at,
    m.weight_kg,
    m.height_cm,
    m.bsa_mosteller,
    m.bsa_dubois
  FROM hema.patients p
  LEFT JOIN LATERAL (
    SELECT measured_at, weight_kg, height_cm, bsa_mosteller, bsa_dubois
    FROM   hema.patient_measurements
    WHERE  patient_id = p.id
    ORDER  BY measured_at DESC
    LIMIT  1
  ) m ON true
  WHERE p.id = p_patient_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Crear paciente (text → bytea via convert_to, sin cifrado real en MVP)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_create_patient(
  p_tenant_id  uuid,
  p_curp       text,
  p_full_name  text,
  p_birth_date date,
  p_sex        text,
  p_nss        text DEFAULT NULL,
  p_allergies  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql SECURITY INVOKER
AS $$
  INSERT INTO hema.patients (
    tenant_id, curp, full_name_encrypted, birth_date, sex, nss, allergies
  )
  VALUES (
    p_tenant_id,
    p_curp,
    convert_to(p_full_name, 'UTF8'),
    p_birth_date,
    p_sex,
    p_nss,
    p_allergies
  )
  RETURNING id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Agregar medición (BSA se calcula en columnas GENERATED del schema)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_add_measurement(
  p_patient_id  uuid,
  p_weight_kg   numeric,
  p_height_cm   numeric,
  p_recorded_by uuid,
  p_measured_at timestamptz DEFAULT now()
)
RETURNS TABLE (id uuid, bsa_mosteller numeric, bsa_dubois numeric)
LANGUAGE sql SECURITY INVOKER
AS $$
  INSERT INTO hema.patient_measurements (
    patient_id, measured_at, weight_kg, height_cm, recorded_by
  )
  VALUES (p_patient_id, p_measured_at, p_weight_kg, p_height_cm, p_recorded_by)
  RETURNING id, bsa_mosteller, bsa_dubois;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos — authenticated = usuarios con JWT válido de Supabase Auth
-- ─────────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.hema_list_patients(int, int)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.hema_get_patient(uuid)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.hema_create_patient(uuid, text, text, date, text, text, text)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.hema_add_measurement(uuid, numeric, numeric, uuid, timestamptz)
  TO authenticated;
