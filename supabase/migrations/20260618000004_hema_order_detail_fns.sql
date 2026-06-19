-- HEMA: RPCs de detalle de orden y persistencia de PDF (Sesión 10)
-- Afecta schema: public (funciones), no toca hema
-- Reversión:
--   DROP FUNCTION public.hema_get_order_detail(uuid);
--   DROP FUNCTION public.hema_set_order_pdf(uuid,text,text,text);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. hema_get_order_detail — orden completa para detalle UI y generación de PDF
--    SECURITY INVOKER: confía en orders_tenant_isolation (RLS). Si el order_id
--    pertenece a otro tenant, simplemente no devuelve filas (no hay leak).
--    full_name_encrypted se lee con convert_from, mismo patrón MVP que
--    hema_get_patient (20260615000001_hema_patient_fns.sql).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_get_order_detail(p_order_id uuid)
RETURNS TABLE (
  id                       uuid,
  status                   text,
  cycle_number             int,
  day_of_cycle             int,
  scheduled_for            date,
  bsa_used                 numeric,
  bsa_formula              text,
  ecog                     int,
  disclaimer               text,
  created_at               timestamptz,
  pdf_path                 text,
  pdf_sha256               text,
  qr_payload               text,
  signed_at                timestamptz,
  signed_by_name           text,
  co_signed_by_name        text,
  tenant_id                uuid,
  tenant_name              text,
  tenant_clues             text,
  tenant_cofepris_license  text,
  patient_id               uuid,
  patient_curp             text,
  patient_display_name     text,
  patient_birth_date       date,
  patient_sex              text,
  patient_allergies        text,
  diagnosis_code           text,
  diagnosis_desc           text,
  protocol_id              uuid,
  protocol_code            text,
  protocol_name            text,
  protocol_cycle_length_days int,
  protocol_total_cycles    int,
  created_by_name          text,
  created_by_license       text,
  drugs                    jsonb,
  signatures                jsonb
)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT
    o.id,
    o.status,
    o.cycle_number,
    o.day_of_cycle,
    o.scheduled_for,
    o.bsa_used,
    o.bsa_formula,
    o.ecog,
    o.disclaimer,
    o.created_at,
    o.pdf_path,
    o.pdf_sha256,
    o.qr_payload,
    o.signed_at,
    signer.full_name      AS signed_by_name,
    cosigner.full_name    AS co_signed_by_name,
    o.tenant_id,
    t.name                AS tenant_name,
    t.clues                AS tenant_clues,
    t.cofepris_license    AS tenant_cofepris_license,
    p.id                   AS patient_id,
    p.curp                AS patient_curp,
    convert_from(p.full_name_encrypted, 'UTF8') AS patient_display_name,
    p.birth_date           AS patient_birth_date,
    p.sex                  AS patient_sex,
    p.allergies             AS patient_allergies,
    o.diagnosis_code,
    dx.description_es      AS diagnosis_desc,
    pr.id                   AS protocol_id,
    pr.code                AS protocol_code,
    pr.name                AS protocol_name,
    pr.cycle_length_days    AS protocol_cycle_length_days,
    pr.total_cycles        AS protocol_total_cycles,
    creator.full_name      AS created_by_name,
    creator.professional_license AS created_by_license,
    COALESCE(drugs_agg.drugs, '[]'::jsonb)         AS drugs,
    COALESCE(sig_agg.signatures, '[]'::jsonb)      AS signatures
  FROM hema.orders o
  JOIN hema.patients  p  ON p.id = o.patient_id
  JOIN hema.protocols pr ON pr.id = o.protocol_id
  JOIN hema.tenants   t  ON t.id = o.tenant_id
  LEFT JOIN hema.diagnoses dx ON dx.code = o.diagnosis_code

  LEFT JOIN hema.users     signer_u ON signer_u.id = o.signed_by
  LEFT JOIN public.doctors signer   ON signer.id = signer_u.doctor_id

  LEFT JOIN hema.users     cosigner_u ON cosigner_u.id = o.co_signed_by
  LEFT JOIN public.doctors cosigner   ON cosigner.id = cosigner_u.doctor_id

  LEFT JOIN hema.users     creator_u ON creator_u.id = o.created_by
  LEFT JOIN public.doctors creator   ON creator.id = creator_u.doctor_id

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
    FROM   hema.order_drugs od
    JOIN   hema.drugs d ON d.id = od.drug_id
    WHERE  od.order_id = o.id
  ) drugs_agg ON true

  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
             'id', s.id,
             'user_id', s.user_id,
             'signer_name', sd.full_name,
             'psc_provider', s.psc_provider,
             'signed_at', s.signed_at
           ) ORDER BY s.signed_at) AS signatures
    FROM   hema.signatures s
    LEFT JOIN hema.users     su ON su.id = s.user_id
    LEFT JOIN public.doctors sd ON sd.id = su.doctor_id
    WHERE  s.order_id = o.id
  ) sig_agg ON true

  WHERE o.id = p_order_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. hema_set_order_pdf — persiste path/hash/QR tras generar el PDF NOM-004.
--    Solo permitido en estado draft/validated: una orden firmada no puede
--    regenerar su PDF (invalidaría pdf_sha256 == hema.signatures.signed_hash).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_set_order_pdf(
  p_order_id   uuid,
  p_pdf_path   text,
  p_pdf_sha256 text,
  p_qr_payload text
)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM hema.orders WHERE id = p_order_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'HEMA-NOT-FOUND: Orden % no existe', p_order_id;
  END IF;

  IF v_status NOT IN ('draft', 'validated') THEN
    RAISE EXCEPTION 'HEMA-INVALID-STATUS: No se puede regenerar el PDF de una orden en estado %', v_status;
  END IF;

  UPDATE hema.orders
  SET    pdf_path   = p_pdf_path,
         pdf_sha256 = p_pdf_sha256,
         qr_payload = p_qr_payload
  WHERE  id = p_order_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.hema_get_order_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hema_set_order_pdf(uuid, text, text, text) TO authenticated;
