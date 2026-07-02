-- HEMA Sesión 11 – Paso 1: Auditoría de aprobación de protocolos
-- hema.protocols es catálogo global sin tenant_id → audit_trigger_function()
-- universal no puede usarse (audit_log.tenant_id NOT NULL).
-- Solución: INSERT explícito en hema.audit_log dentro de hema_approve_protocol,
-- usando el tenant_id del director_medico que aprueba.
-- protocol_drugs y protocol_diagnoses tienen la misma limitación; se auditarán
-- explícitamente cuando se implementen sus RPCs de gestión (Sesión 12+).
-- Reversión: restaurar hema_approve_protocol desde 20260617000002_hema_admin_protocols_fns.sql

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
  v_caller_id     uuid := auth.uid();
  v_caller_role   text;
  v_caller_tenant uuid;
  v_doctor_name   text;
  v_before_json   jsonb;
  v_after_json    jsonb;
  v_prev_hash     text;
  v_row_hash      text;
BEGIN
  SELECT hu.role, hu.tenant_id INTO v_caller_role, v_caller_tenant
  FROM   hema.users hu
  WHERE  hu.id = v_caller_id AND hu.active = true;

  IF v_caller_role IS DISTINCT FROM 'director_medico' THEN
    RAISE EXCEPTION 'HEMA-FORBIDDEN: Solo el director médico puede aprobar protocolos';
  END IF;

  -- Captura estado anterior para audit trail
  SELECT to_jsonb(p) INTO v_before_json
  FROM   hema.protocols p
  WHERE  p.id = p_protocol_id;

  IF v_before_json IS NULL THEN
    RAISE EXCEPTION 'HEMA-NOT-FOUND: Protocolo % no existe', p_protocol_id;
  END IF;

  UPDATE hema.protocols
  SET    active                       = true,
         approved_by_medical_director = v_caller_id,
         approved_at                  = now()
  WHERE  hema.protocols.id = p_protocol_id;

  -- Captura estado posterior
  SELECT to_jsonb(p) INTO v_after_json
  FROM   hema.protocols p
  WHERE  p.id = p_protocol_id;

  -- Hash encadenado — mismo algoritmo que audit_trigger_function()
  -- Cadena: por (entity, entity_id), no global ni por tenant
  SELECT row_hash INTO v_prev_hash
  FROM   hema.audit_log
  WHERE  entity = 'protocols' AND entity_id = p_protocol_id
  ORDER  BY id DESC LIMIT 1;

  v_row_hash := encode(
    digest(
      COALESCE(v_prev_hash, '')             ||
      'UPDATE'                              ||
      'protocols'                           ||
      COALESCE(p_protocol_id::text, '')     ||
      COALESCE(v_after_json::text, v_before_json::text, ''),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO hema.audit_log (
    tenant_id, user_id, action, entity, entity_id,
    before_json, after_json,
    ip_address, user_agent,
    prev_row_hash, row_hash, created_at
  ) VALUES (
    v_caller_tenant, v_caller_id, 'UPDATE', 'protocols', p_protocol_id,
    v_before_json, v_after_json,
    (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for')::inet,
    current_setting('request.headers', true)::jsonb ->> 'user-agent',
    v_prev_hash, v_row_hash, now()
  );

  SELECT doc.full_name INTO v_doctor_name
  FROM   hema.users    hu
  LEFT JOIN public.doctors doc ON doc.id = hu.doctor_id
  WHERE  hu.id = v_caller_id;

  RETURN QUERY
  SELECT p.id, p.active, p.approved_at, v_doctor_name
  FROM   hema.protocols p
  WHERE  p.id = p_protocol_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hema_approve_protocol(uuid) TO authenticated;
