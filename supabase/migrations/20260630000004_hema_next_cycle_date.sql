-- HEMA: next_cycle_date en hema.orders — campo opcional llenado por el médico
-- Supercede el RPC de 20260630000003 (hema_get_order_detail v2 → v3 = v2 + next_cycle_date)
-- Afecta: hema.orders (columna), public.hema_create_order (nuevo param), public.hema_get_order_detail (salida)
-- Reversión:
--   ALTER TABLE hema.orders DROP COLUMN next_cycle_date;
--   (restaurar hema_create_order a la versión de 20260617000003_hema_orders_fns.sql)
--   (restaurar hema_get_order_detail a la versión de 20260630000003_hema_order_detail_v2.sql)

-- ── 1. Columna ─────────────────────────────────────────────────────────────────
ALTER TABLE hema.orders
  ADD COLUMN IF NOT EXISTS next_cycle_date DATE;

-- ── 2. hema_create_order v2 — agrega p_next_cycle_date opcional ────────────────
-- PostgreSQL no admite CREATE OR REPLACE al cambiar la firma de parámetros:
-- se elimina la versión anterior (14 params) y se crea con 15.
DROP FUNCTION IF EXISTS public.hema_create_order(
  uuid, uuid, uuid, text, int, int, uuid, numeric, text, date, uuid, jsonb, int, uuid
);

CREATE FUNCTION public.hema_create_order(
  p_tenant_id       uuid,
  p_patient_id      uuid,
  p_protocol_id     uuid,
  p_diagnosis_code  text,
  p_cycle_number    int,
  p_day_of_cycle    int,
  p_measurement_id  uuid,
  p_bsa_used        numeric,
  p_bsa_formula     text,
  p_scheduled_for   date,
  p_created_by      uuid,
  p_drugs           jsonb,
  p_ecog            int  DEFAULT NULL,
  p_lab_panel_id    uuid DEFAULT NULL,
  p_next_cycle_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_order_id uuid;
  v_drug     jsonb;
BEGIN
  INSERT INTO hema.orders (
    tenant_id, patient_id, protocol_id, diagnosis_code, cycle_number, day_of_cycle,
    measurement_id, lab_panel_id, bsa_used, bsa_formula, ecog, scheduled_for,
    next_cycle_date, status, created_by
  ) VALUES (
    p_tenant_id, p_patient_id, p_protocol_id, p_diagnosis_code, p_cycle_number, p_day_of_cycle,
    p_measurement_id, p_lab_panel_id, p_bsa_used, p_bsa_formula, p_ecog, p_scheduled_for,
    p_next_cycle_date, 'validated', p_created_by
  )
  RETURNING id INTO v_order_id;

  FOR v_drug IN SELECT * FROM jsonb_array_elements(p_drugs) LOOP
    INSERT INTO hema.order_drugs (
      order_id, protocol_drug_id, drug_id, computed_dose_mg, base_dose_mg,
      reduction_pct, reduction_reason, route, infusion_minutes, vehicle,
      given_on_day, warnings, override_reason
    ) VALUES (
      v_order_id,
      (v_drug->>'protocol_drug_id')::uuid,
      (v_drug->>'drug_id')::uuid,
      (v_drug->>'computed_dose_mg')::numeric,
      (v_drug->>'base_dose_mg')::numeric,
      COALESCE((v_drug->>'reduction_pct')::numeric, 0),
      v_drug->>'reduction_reason',
      v_drug->>'route',
      (v_drug->>'infusion_minutes')::int,
      v_drug->>'vehicle',
      (v_drug->>'given_on_day')::int,
      COALESCE(v_drug->'warnings', '[]'::jsonb),
      v_drug->>'override_reason'
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- ── 3. hema_get_order_detail v3 (= v2 + next_cycle_date) ──────────────────────
-- RETURNS TABLE cambia (nueva columna) → DROP + CREATE obligatorio.
DROP FUNCTION IF EXISTS public.hema_get_order_detail(uuid);

CREATE FUNCTION public.hema_get_order_detail(p_order_id uuid)
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
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
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
$$;

-- ── 4. Permisos ────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.hema_create_order(
  uuid, uuid, uuid, text, int, int, uuid, numeric, text, date, uuid, jsonb, int, uuid, date
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.hema_get_order_detail(uuid) TO authenticated;
