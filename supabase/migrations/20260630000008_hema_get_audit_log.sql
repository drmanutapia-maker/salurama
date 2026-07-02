-- HEMA Sesión 11 – Paso 4: RPC hema_get_audit_log
-- Expone audit_log (DML) + access_log (lecturas) unificados para la UI de
-- auditoría. SECURITY DEFINER + chequeo de rol explícito: solo
-- director_medico y admin pueden consultar la bitácora, independientemente
-- de lo que permita la RLS subyacente de audit_log.
-- Reversión: DROP FUNCTION public.hema_get_audit_log(text,uuid,uuid,timestamptz,timestamptz,int,int);

CREATE OR REPLACE FUNCTION public.hema_get_audit_log(
  p_entity    text        DEFAULT NULL,
  p_entity_id uuid        DEFAULT NULL,
  p_user_id   uuid        DEFAULT NULL,
  p_from      timestamptz DEFAULT NULL,
  p_to        timestamptz DEFAULT NULL,
  p_limit     int         DEFAULT 50,
  p_offset    int         DEFAULT 0
)
RETURNS TABLE (
  log_type    text,
  id          bigint,
  occurred_at timestamptz,
  user_id     uuid,
  user_name   text,
  action      text,
  entity      text,
  entity_id   uuid,
  before_json jsonb,
  after_json  jsonb,
  ip_address  inet,
  user_agent  text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_tenant_id   uuid := hema.current_tenant_id();
BEGIN
  SELECT role INTO v_caller_role
  FROM hema.users
  WHERE id = v_caller_id AND active = true;

  IF v_caller_role NOT IN ('director_medico', 'admin') THEN
    RAISE EXCEPTION 'HEMA-FORBIDDEN: Solo director_medico y admin pueden consultar la bitácora';
  END IF;

  RETURN QUERY
  SELECT
    'dml'::text         AS log_type,
    al.id,
    al.created_at       AS occurred_at,
    al.user_id,
    doc.full_name       AS user_name,
    al.action,
    al.entity,
    al.entity_id,
    al.before_json,
    al.after_json,
    al.ip_address,
    al.user_agent
  FROM hema.audit_log al
  LEFT JOIN hema.users     hu  ON hu.id  = al.user_id
  LEFT JOIN public.doctors doc ON doc.id = hu.doctor_id
  WHERE al.tenant_id = v_tenant_id
    AND (p_entity    IS NULL OR al.entity    = p_entity)
    AND (p_entity_id IS NULL OR al.entity_id = p_entity_id)
    AND (p_user_id   IS NULL OR al.user_id   = p_user_id)
    AND (p_from      IS NULL OR al.created_at  >= p_from)
    AND (p_to        IS NULL OR al.created_at  <= p_to)

  UNION ALL

  SELECT
    'access'::text      AS log_type,
    acl.id,
    acl.accessed_at     AS occurred_at,
    acl.user_id,
    doc.full_name       AS user_name,
    'SELECT'::text      AS action,
    acl.entity,
    acl.entity_id,
    NULL::jsonb         AS before_json,
    NULL::jsonb         AS after_json,
    acl.ip_address,
    acl.user_agent
  FROM hema.access_log acl
  LEFT JOIN hema.users     hu  ON hu.id  = acl.user_id
  LEFT JOIN public.doctors doc ON doc.id = hu.doctor_id
  WHERE acl.tenant_id = v_tenant_id
    AND (p_entity    IS NULL OR acl.entity    = p_entity)
    AND (p_entity_id IS NULL OR acl.entity_id = p_entity_id)
    AND (p_user_id   IS NULL OR acl.user_id   = p_user_id)
    AND (p_from      IS NULL OR acl.accessed_at >= p_from)
    AND (p_to        IS NULL OR acl.accessed_at <= p_to)

  ORDER BY occurred_at DESC
  LIMIT  LEAST(p_limit, 200)
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hema_get_audit_log(
  text, uuid, uuid, timestamptz, timestamptz, int, int
) TO authenticated;
