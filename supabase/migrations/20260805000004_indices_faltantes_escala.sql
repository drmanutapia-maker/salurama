-- Índices faltantes identificados en la auditoría de resiliencia a escala
-- (2026-08-05). Todas las tablas afectadas tienen volumen mínimo hoy — esto
-- es prevención, no corrección de un problema de performance activo.
-- Reversión:
--   DROP INDEX hema.orders_tenant_id_idx;
--   DROP INDEX hema.lab_panels_tenant_id_idx;
--   DROP INDEX hema.users_tenant_id_idx;
--   DROP INDEX public.citas_paciente_id_idx;
--   DROP INDEX public.chat_mensajes_medico_id_idx;
--   DROP INDEX public.chat_archivos_medico_id_idx;
--   DROP INDEX hema.order_drugs_order_id_idx;
--   DROP INDEX hema.signatures_order_id_idx;
--   DROP INDEX public.doctor_specialties_doctor_id_idx;
--   DROP INDEX public.chat_salas_cita_actual_id_idx;

-- Alto: filtro de cada política RLS multi-tenant de HEMA, se degrada a full
-- scan conforme crezcan tenants/filas.
CREATE INDEX IF NOT EXISTS orders_tenant_id_idx     ON hema.orders(tenant_id);
CREATE INDEX IF NOT EXISTS lab_panels_tenant_id_idx ON hema.lab_panels(tenant_id);
CREATE INDEX IF NOT EXISTS users_tenant_id_idx      ON hema.users(tenant_id);

-- Alto: ya con tráfico real hoy (dashboard de citas, chat médico-paciente).
CREATE INDEX IF NOT EXISTS citas_paciente_id_idx        ON public.citas(paciente_id);
CREATE INDEX IF NOT EXISTS chat_mensajes_medico_id_idx  ON public.chat_mensajes(medico_id);
CREATE INDEX IF NOT EXISTS chat_archivos_medico_id_idx  ON public.chat_archivos(medico_id);

-- Medio: tráfico moderado (detalle de orden, perfil público, chat).
CREATE INDEX IF NOT EXISTS order_drugs_order_id_idx        ON hema.order_drugs(order_id);
CREATE INDEX IF NOT EXISTS signatures_order_id_idx         ON hema.signatures(order_id);
CREATE INDEX IF NOT EXISTS doctor_specialties_doctor_id_idx ON public.doctor_specialties(doctor_id);
CREATE INDEX IF NOT EXISTS chat_salas_cita_actual_id_idx    ON public.chat_salas(cita_actual_id);
