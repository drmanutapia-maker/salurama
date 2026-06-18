-- HEMA: RPCs admin de protocolos (Sesión 7 resto) + rol director_medico
-- Afecta schema: hema (ALTER constraint) + public (funciones)
-- Reversión:
--   DROP FUNCTION public.hema_list_protocols(text, boolean);
--   DROP FUNCTION public.hema_get_protocol(uuid);
--   DROP FUNCTION public.hema_approve_protocol(uuid);
--   DROP FUNCTION public.hema_get_my_role();
--   ALTER TABLE hema.users DROP CONSTRAINT users_role_check;
--   ALTER TABLE hema.users ADD CONSTRAINT users_role_check
--     CHECK (role IN ('admin','medico','enfermeria','farmacia','auditor'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Agregar rol 'director_medico' (no existía en el constraint original).
--    Verificado en producción: constraint actual = users_role_check,
--    solo 1 usuario con role='medico', ningún director_medico aún.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE hema.users DROP CONSTRAINT users_role_check;

ALTER TABLE hema.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','medico','enfermeria','farmacia','auditor','director_medico'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. hema_list_protocols — catálogo filtrable por diagnóstico CIE-10 y estado
--    SECURITY INVOKER: las políticas RLS ya permiten SELECT a cualquier
--    autenticado sobre protocols/protocol_diagnoses/protocol_drugs (catálogo
--    global de solo lectura), igual que hema_list_patients.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_list_protocols(
  p_diagnosis_code text    DEFAULT NULL,
  p_active         boolean DEFAULT NULL
)
RETURNS TABLE (
  id                uuid,
  code              text,
  name              text,
  cycle_length_days int,
  total_cycles      int,
  line_of_therapy   text,
  specialty         text,
  active            boolean,
  approved_at       timestamptz,
  status            text,
  diagnosis_codes   text[],
  drug_count        int
)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT
    p.id,
    p.code,
    p.name,
    p.cycle_length_days,
    p.total_cycles,
    p.line_of_therapy,
    p.specialty,
    p.active,
    p.approved_at,
    CASE
      WHEN p.active THEN 'activo'
      WHEN p.approved_by_medical_director IS NULL THEN 'pendiente'
      ELSE 'inactivo'
    END AS status,
    ARRAY(
      SELECT pd.diagnosis_code
      FROM   hema.protocol_diagnoses pd
      WHERE  pd.protocol_id = p.id
      ORDER  BY pd.is_preferred DESC, pd.diagnosis_code
    ) AS diagnosis_codes,
    (SELECT count(*)::int FROM hema.protocol_drugs pdr WHERE pdr.protocol_id = p.id) AS drug_count
  FROM hema.protocols p
  WHERE
    (p_diagnosis_code IS NULL OR EXISTS (
      SELECT 1 FROM hema.protocol_diagnoses pd2
      WHERE pd2.protocol_id = p.id AND pd2.diagnosis_code = p_diagnosis_code
    ))
    AND (p_active IS NULL OR p.active = p_active)
  ORDER BY p.code;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. hema_get_protocol — detalle completo: fármacos, dosis, diagnósticos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_get_protocol(p_protocol_id uuid)
RETURNS TABLE (
  id                   uuid,
  code                 text,
  name                 text,
  cycle_length_days    int,
  total_cycles         int,
  line_of_therapy      text,
  specialty            text,
  active               boolean,
  approved_at          timestamptz,
  approved_by_name     text,
  status               text,
  protocol_references  jsonb,
  diagnoses            jsonb,
  drugs                jsonb
)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT
    p.id,
    p.code,
    p.name,
    p.cycle_length_days,
    p.total_cycles,
    p.line_of_therapy,
    p.specialty,
    p.active,
    p.approved_at,
    doc.full_name AS approved_by_name,
    CASE
      WHEN p.active THEN 'activo'
      WHEN p.approved_by_medical_director IS NULL THEN 'pendiente'
      ELSE 'inactivo'
    END AS status,
    p.protocol_references,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'code', dx.code,
               'description_es', dx.description_es,
               'is_preferred', pd.is_preferred
             ) ORDER BY pd.is_preferred DESC, dx.code)
      FROM   hema.protocol_diagnoses pd
      JOIN   hema.diagnoses dx ON dx.code = pd.diagnosis_code
      WHERE  pd.protocol_id = p.id
    ), '[]'::jsonb) AS diagnoses,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', pdr.id,
               'drug_id', pdr.drug_id,
               'inn', d.inn,
               'dose_value', pdr.dose_value,
               'dose_unit', pdr.dose_unit,
               'route', pdr.route,
               'days_of_cycle', pdr.days_of_cycle,
               'max_dose_mg', pdr.max_dose_mg,
               'infusion_minutes', pdr.infusion_minutes,
               'vehicle', pdr.vehicle,
               'premed_required', pdr.premed_required,
               'sequence_order', pdr.sequence_order
             ) ORDER BY pdr.sequence_order NULLS LAST, d.inn)
      FROM   hema.protocol_drugs pdr
      JOIN   hema.drugs d ON d.id = pdr.drug_id
      WHERE  pdr.protocol_id = p.id
    ), '[]'::jsonb) AS drugs
  FROM hema.protocols p
  LEFT JOIN hema.users   hu  ON hu.id = p.approved_by_medical_director
  LEFT JOIN public.doctors doc ON doc.id = hu.doctor_id
  WHERE p.id = p_protocol_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. hema_approve_protocol — solo role='director_medico'
--    SECURITY DEFINER porque "protocols_no_write" en RLS bloquea todo UPDATE
--    desde el cliente. El chequeo de rol AQUÍ es el límite de seguridad real;
--    cualquier gating en la UI es solo cosmético.
--    NOTA: hema.protocols es catálogo global (sin tenant_id), igual que en el
--    resto del esquema, así que la verificación es por rol, no por tenant.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_approve_protocol(p_protocol_id uuid)
RETURNS TABLE (
  id               uuid,
  active           boolean,
  approved_at      timestamptz,
  approved_by_name text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_doctor_name text;
BEGIN
  SELECT hu.role INTO v_caller_role
  FROM   hema.users hu
  WHERE  hu.id = v_caller_id AND hu.active = true;

  IF v_caller_role IS DISTINCT FROM 'director_medico' THEN
    RAISE EXCEPTION 'HEMA-FORBIDDEN: Solo el director médico puede aprobar protocolos';
  END IF;

  UPDATE hema.protocols
  SET    active = true,
         approved_by_medical_director = v_caller_id,
         approved_at = now()
  WHERE  hema.protocols.id = p_protocol_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HEMA-NOT-FOUND: Protocolo % no existe', p_protocol_id;
  END IF;

  SELECT doc.full_name INTO v_doctor_name
  FROM   hema.users hu
  LEFT JOIN public.doctors doc ON doc.id = hu.doctor_id
  WHERE  hu.id = v_caller_id;

  RETURN QUERY
  SELECT p.id, p.active, p.approved_at, v_doctor_name
  FROM   hema.protocols p
  WHERE  p.id = p_protocol_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. hema_get_my_role — helper de SOLO LECTURA para gating de UI
--    (el JWT no lleva role; hema.users no está expuesto en Data API)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_get_my_role()
RETURNS text
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT role FROM hema.users WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.hema_list_protocols(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hema_get_protocol(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.hema_approve_protocol(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.hema_get_my_role()                 TO authenticated;
