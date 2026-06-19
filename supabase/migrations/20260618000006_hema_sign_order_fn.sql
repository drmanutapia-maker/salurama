-- HEMA: RPC de firma de orden — modo dev (Sesión 10)
-- Afecta schema: public (función), no toca hema
-- Reversión: DROP FUNCTION public.hema_sign_order(uuid, text);

-- ─────────────────────────────────────────────────────────────────────────────
-- hema_sign_order — firma una indicación.
--
-- SECURITY DEFINER + chequeo de rol manual: mismo patrón que
-- hema_approve_protocol (20260617000002). El gating de UI es cosmético;
-- este chequeo es el límite de seguridad real.
--
-- p_psc_provider = 'dev' es el ÚNICO modo soportado por ahora. Registra
-- quién firmó, cuándo, y sobre qué hash de PDF — pero NO es una firma
-- electrónica avanzada NOM-151 válida (no hay sello de un PSC acreditado).
-- Sirve para probar el flujo completo (PDF → firma → estado 'signed')
-- mientras se contrata Mifiel o Advantage Security. Cualquier otro valor
-- de p_psc_provider falla explícitamente — así no hay forma de "fingir"
-- una firma real por accidente.
--
-- Co-firma (hema.orders.co_signed_by) para las 5 clases de override
-- crítico queda FUERA de esta migración — no estaba en el plan aprobado
-- de Sesión 10. Se agregará en una migración aparte cuando se implemente.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_sign_order(
  p_order_id     uuid,
  p_psc_provider text DEFAULT 'dev'
)
RETURNS TABLE (
  order_id     uuid,
  status       text,
  signed_at    timestamptz,
  signature_id uuid
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id     uuid := auth.uid();
  v_caller_role   text;
  v_caller_tenant uuid;
  v_order         hema.orders%ROWTYPE;
  v_signature_id  uuid;
  v_signed_at     timestamptz := now();
BEGIN
  SELECT hu.role, hu.tenant_id INTO v_caller_role, v_caller_tenant
  FROM   hema.users hu
  WHERE  hu.id = v_caller_id AND hu.active = true;

  IF v_caller_role NOT IN ('medico', 'director_medico') THEN
    RAISE EXCEPTION 'HEMA-FORBIDDEN: Solo médicos pueden firmar indicaciones';
  END IF;

  SELECT * INTO v_order FROM hema.orders WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'HEMA-NOT-FOUND: Orden % no existe', p_order_id;
  END IF;

  IF v_order.tenant_id IS DISTINCT FROM v_caller_tenant THEN
    RAISE EXCEPTION 'HEMA-FORBIDDEN: La orden pertenece a otro tenant';
  END IF;

  IF v_order.status NOT IN ('draft', 'validated') THEN
    RAISE EXCEPTION 'HEMA-INVALID-STATUS: La orden ya está en estado % y no puede firmarse de nuevo', v_order.status;
  END IF;

  IF v_order.pdf_sha256 IS NULL THEN
    RAISE EXCEPTION 'HEMA-PDF-REQUIRED: Genera el PDF de la indicación antes de firmar';
  END IF;

  IF p_psc_provider IS DISTINCT FROM 'dev' THEN
    RAISE EXCEPTION 'HEMA-PSC-NOT-CONFIGURED: Proveedor % no está conectado todavía', p_psc_provider;
  END IF;

  INSERT INTO hema.signatures (
    order_id, user_id, psc_provider, psc_document_id, signed_hash, signed_at
  ) VALUES (
    p_order_id, v_caller_id, 'dev', 'DEV-' || p_order_id::text, v_order.pdf_sha256, v_signed_at
  )
  RETURNING id INTO v_signature_id;

  UPDATE hema.orders
  SET    status = 'signed', signed_at = v_signed_at, signed_by = v_caller_id
  WHERE  id = p_order_id;

  RETURN QUERY SELECT p_order_id, 'signed'::text, v_signed_at, v_signature_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hema_sign_order(uuid, text) TO authenticated;
