-- Agrega patient_diagnoses al lookup de tenant_id en la función de auditoría.
-- Colapsado con patient_measurements y cumulative_doses: los tres heredan
-- tenant_id de hema.patients via patient_id.

CREATE OR REPLACE FUNCTION hema.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id   uuid;
  v_entity_id   uuid;
  v_before_json jsonb;
  v_after_json  jsonb;
  v_prev_hash   text;
  v_row_hash    text;
  v_row_data    jsonb;
BEGIN
  v_row_data  := to_jsonb(COALESCE(NEW, OLD));
  v_tenant_id := (v_row_data ->> 'tenant_id')::uuid;

  -- Lookup para tablas que no tienen tenant_id directo
  IF v_tenant_id IS NULL THEN
    CASE TG_TABLE_NAME
      WHEN 'patient_measurements', 'cumulative_doses', 'patient_diagnoses' THEN
        SELECT p.tenant_id INTO v_tenant_id
        FROM hema.patients p
        WHERE p.id = (v_row_data ->> 'patient_id')::uuid;
      WHEN 'order_drugs', 'signatures' THEN
        SELECT o.tenant_id INTO v_tenant_id
        FROM hema.orders o
        WHERE o.id = (v_row_data ->> 'order_id')::uuid;
      WHEN 'lab_values' THEN
        SELECT lp.tenant_id INTO v_tenant_id
        FROM hema.lab_panels lp
        WHERE lp.id = (v_row_data ->> 'panel_id')::uuid;
      ELSE NULL;
    END CASE;
  END IF;

  v_entity_id := (v_row_data ->> 'id')::uuid;

  IF TG_OP = 'INSERT' THEN
    v_before_json := NULL;
    v_after_json  := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_before_json := to_jsonb(OLD);
    v_after_json  := to_jsonb(NEW);
  ELSE
    v_before_json := to_jsonb(OLD);
    v_after_json  := NULL;
  END IF;

  SELECT row_hash INTO v_prev_hash
  FROM hema.audit_log
  WHERE entity = TG_TABLE_NAME AND entity_id = v_entity_id
  ORDER BY id DESC LIMIT 1;

  v_row_hash := encode(
    digest(
      COALESCE(v_prev_hash, '') ||
      TG_OP || TG_TABLE_NAME ||
      COALESCE(v_entity_id::text, '') ||
      COALESCE(v_after_json::text, v_before_json::text, ''),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO hema.audit_log (
    tenant_id, user_id, action, entity, entity_id,
    before_json, after_json, ip_address, user_agent,
    prev_row_hash, row_hash, created_at
  ) VALUES (
    v_tenant_id, auth.uid(), TG_OP, TG_TABLE_NAME, v_entity_id,
    v_before_json, v_after_json,
    (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for')::inet,
    current_setting('request.headers', true)::jsonb ->> 'user-agent',
    v_prev_hash, v_row_hash, now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
