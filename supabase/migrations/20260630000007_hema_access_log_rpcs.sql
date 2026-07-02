-- HEMA Sesión 11 – Paso 3: Registro de accesos de lectura en hema_get_patient
-- y hema_get_order_detail.
-- Cambios respecto a versiones anteriores:
--   · LANGUAGE sql STABLE → plpgsql (STABLE no permite DML)
--   · INSERT en hema.access_log ANTES del RETURN QUERY — fail-hard deliberado:
--     si el registro de acceso falla, la función falla y no devuelve datos.
--     Esto garantiza que no existe acceso a datos clínicos sin trazabilidad.
-- Firma sin cambios → CREATE OR REPLACE válido, sin DROP.
-- Reversión: restaurar desde 20260615000001 (hema_get_patient)
--            y 20260630000004 (hema_get_order_detail).

-- ── 1. hema_get_patient ────────────────────────────────────────────────────────
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
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
  INSERT INTO hema.access_log (tenant_id, user_id, entity, entity_id, ip_address, user_agent)
  VALUES (
    hema.current_tenant_id(),
    auth.uid(),
    'patients',
    p_patient_id,
    (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for')::inet,
    current_setting('request.headers', true)::jsonb ->> 'user-agent'
  );

  RETURN QUERY
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
END;
$$;

GRANT EXECUTE ON FUNCTION public.hema_get_patient(uuid) TO authenticated;

-- ── 2. hema_get_order_detail ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.hema_get_order_detail(p_order_id uuid)
RETURNS TABLE (
  id                            uuid,
  status                        text,
  cycle_number                  int,
  day_of_cycle                  int,
  scheduled_for                 date,
  next_cycle_date               date,
  bsa_used                      numeric,
  bsa_formula                   text,
  ecog                          int,
  disclaimer                    text,
  created_at                    timestamptz,
  pdf_path                      text,
  pdf_sha256                    text,
  qr_payload                    text,
  signed_at                     timestamptz,
  signed_by_name                text,
  co_signed_by_name             text,
  tenant_id                     uuid,
  tenant_name                   text,
  tenant_clues                  text,
  tenant_cofepris_license       text,
  tenant_type                   text,
  tenant_code                   text,
  patient_id                    uuid,
  patient_curp                  text,
  patient_display_name          text,
  patient_birth_date            date,
  patient_sex                   text,
  patient_allergies             text,
  patient_expediente_sequential int,
  patient_weight_kg             numeric,
  patient_height_cm             numeric,
  diagnosis_code                text,
  diagnosis_desc                text,
  protocol_id                   uuid,
  protocol_code                 text,
  protocol_name                 text,
  protocol_cycle_length_days    int,
  protocol_total_cycles         int,
  created_by_name               text,
  created_by_license            text,
  drugs                         jsonb,
  signatures                    jsonb
)
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
  INSERT INTO hema.access_log (tenant_id, user_id, entity, entity_id, ip_address, user_agent)
  VALUES (
    hema.current_tenant_id(),
    auth.uid(),
    'orders',
    p_order_id,
    (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for')::inet,
    current_setting('request.headers', true)::jsonb ->> 'user-agent'
  );

  RETURN QUERY
  SELECT
    o.id,
    o.status,
    o.cycle_number,
    o.day_of_cycle,
    o.scheduled_for,
    o.next_cycle_date,
    o.bsa_used,
    o.bsa_formula,
    o.ecog,
    o.disclaimer,
    o.created_at,
    o.pdf_path,
    o.pdf_sha256,
    o.qr_payload,
    o.signed_at,
    signer.full_name       AS signed_by_name,
    cosigner.full_name     AS co_signed_by_name,
    o.tenant_id,
    t.name                 AS tenant_name,
    t.clues                AS tenant_clues,
    t.cofepris_license     AS tenant_cofepris_license,
    t.tenant_type          AS tenant_type,
    t.tenant_code          AS tenant_code,
    p.id                   AS patient_id,
    p.curp                 AS patient_curp,
    convert_from(p.full_name_encrypted, 'UTF8') AS patient_display_name,
    p.birth_date           AS patient_birth_date,
    p.sex                  AS patient_sex,
    p.allergies            AS patient_allergies,
    p.expediente_sequential AS patient_expediente_sequential,
    m.weight_kg            AS patient_weight_kg,
    m.height_cm            AS patient_height_cm,
    o.diagnosis_code,
    dx.description_es      AS diagnosis_desc,
    pr.id                  AS protocol_id,
    pr.code                AS protocol_code,
    pr.name                AS protocol_name,
    pr.cycle_length_days   AS protocol_cycle_length_days,
    pr.total_cycles        AS protocol_total_cycles,
    creator.full_name      AS created_by_name,
    creator.professional_license AS created_by_license,
    COALESCE(drugs_agg.drugs, '[]'::jsonb)    AS drugs,
    COALESCE(sig_agg.signatures, '[]'::jsonb) AS signatures
  FROM hema.orders o
  JOIN hema.patients             p  ON p.id = o.patient_id
  JOIN hema.protocols            pr ON pr.id = o.protocol_id
  JOIN hema.tenants              t  ON t.id = o.tenant_id
  JOIN hema.patient_measurements m  ON m.id = o.measurement_id
  LEFT JOIN hema.diagnoses       dx ON dx.code = o.diagnosis_code
  LEFT JOIN hema.users           signer_u   ON signer_u.id = o.signed_by
  LEFT JOIN public.doctors       signer     ON signer.id = signer_u.doctor_id
  LEFT JOIN hema.users           cosigner_u ON cosigner_u.id = o.co_signed_by
  LEFT JOIN public.doctors       cosigner   ON cosigner.id = cosigner_u.doctor_id
  LEFT JOIN hema.users           creator_u  ON creator_u.id = o.created_by
  LEFT JOIN public.doctors       creator    ON creator.id = creator_u.doctor_id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
             'id', od.id,
             'drug_id', od.drug_id,
             'inn', d.inn,
             'computed_dose_mg', od.computed_dose_mg,
             'base_dose_mg', od.base_dose_mg,
             'reduction_pct', od.reduction_pct,
             'reduction_reason', od.reduction_reason,
             'route', od.route,
             'infusion_minutes', od.infusion_minutes,
             'vehicle', od.vehicle,
             'given_on_day', od.given_on_day,
             'warnings', od.warnings,
             'override_reason', od.override_reason
           ) ORDER BY od.given_on_day, d.inn) AS drugs
    FROM hema.order_drugs od
    JOIN hema.drugs d ON d.id = od.drug_id
    WHERE od.order_id = o.id
  ) drugs_agg ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
             'id', s.id,
             'user_id', s.user_id,
             'signer_name', sd.full_name,
             'psc_provider', s.psc_provider,
             'signed_at', s.signed_at
           ) ORDER BY s.signed_at) AS signatures
    FROM hema.signatures s
    LEFT JOIN hema.users     su ON su.id = s.user_id
    LEFT JOIN public.doctors sd ON sd.id = su.doctor_id
    WHERE s.order_id = o.id
  ) sig_agg ON true
  WHERE o.id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hema_get_order_detail(uuid) TO authenticated;
