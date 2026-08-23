-- Notificaciones push (web-push/VAPID), Parte 1: tabla de suscripciones.
-- Una fila por navegador/dispositivo que un paciente autorizó — un mismo
-- paciente puede tener varias (varios dispositivos), y se guarda tal cual la
-- forma del objeto PushSubscription del navegador (endpoint + keys.p256dh +
-- keys.auth), para poder pasarlo directo a la librería web-push sin
-- transformar. endpoint es único por navegador/registro, así que sirve de
-- llave natural para upsert al volver a suscribirse.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_paciente_id on push_subscriptions(paciente_id);

comment on table push_subscriptions is
  'Suscripciones push (Web Push API/VAPID) de pacientes, una fila por navegador/dispositivo. Se usa desde el endpoint de envío de mensajes del médico para notificar al paciente. Parte 1 de la implementación de notificaciones push.';
comment on column push_subscriptions.endpoint is
  'URL de push del navegador (única por registro). Llave de upsert al re-suscribirse.';
comment on column push_subscriptions.p256dh is 'subscription.keys.p256dh, tal cual la entrega el navegador.';
comment on column push_subscriptions.auth is 'subscription.keys.auth, tal cual la entrega el navegador.';

-- RLS habilitado sin políticas: el paciente no tiene una fila en auth.users
-- (se identifica por el token del chat, no por sesión de Supabase Auth), así
-- que no hay un auth.uid() contra el cual escribir una política con sentido.
-- Igual que chat_mensajes/chat_archivos para el lado paciente, el acceso es
-- exclusivamente vía la service role key desde los endpoints server-side
-- (que verifican el token del chat antes de tocar esta tabla).
alter table push_subscriptions enable row level security;
