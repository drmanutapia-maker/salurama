-- Notificaciones push para médicos (contraparte de push_subscriptions, que
-- es solo de pacientes). Tabla separada en vez de columnas nullable +
-- CHECK sobre push_subscriptions: esa tabla ya está en producción con
-- paciente_id NOT NULL, y el resto del esquema ya sigue el patrón de una
-- tabla por entidad (doctor_licenses, doctor_gallery_photos, etc.) en vez
-- de tablas polimórficas -- una tabla nueva por rol es consistente con eso
-- y escala igual de bien si algún día se suma otro rol (admin, etc.): se
-- agrega su propia tabla + su propio notificarXPush() en
-- lib/push/enviarPush.ts, sin tocar esta.
create table if not exists doctor_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid not null references doctors(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_doctor_push_subscriptions_medico_id on doctor_push_subscriptions(medico_id);

comment on table doctor_push_subscriptions is
  'Suscripciones push (Web Push API/VAPID) de médicos, una fila por navegador/dispositivo. Contraparte de push_subscriptions (pacientes). Se usa desde los endpoints de cita nueva, mensaje de chat del paciente y reseña nueva.';
comment on column doctor_push_subscriptions.endpoint is
  'URL de push del navegador (única por registro). Llave de upsert al re-suscribirse.';
comment on column doctor_push_subscriptions.p256dh is 'subscription.keys.p256dh, tal cual la entrega el navegador.';
comment on column doctor_push_subscriptions.auth is 'subscription.keys.auth, tal cual la entrega el navegador.';

-- RLS habilitado sin políticas: a diferencia de push_subscriptions (donde el
-- paciente no tiene sesión real y por eso no hay auth.uid() con qué escribir
-- una política), el médico SÍ tiene sesión real de Supabase Auth -- pero el
-- acceso sigue centralizado en /api/push/suscribir-medico (service role) a
-- propósito, para poder exigir el allowlist de endpoints (lib/push/allowlist.ts,
-- defensa contra SSRF ciego) antes de escribir, algo que una política RLS de
-- INSERT no puede validar por sí sola.
alter table doctor_push_subscriptions enable row level security;
