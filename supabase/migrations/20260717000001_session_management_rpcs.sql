-- Revocación remota de sesiones: auth.sessions no está expuesta vía PostgREST
-- (solo public/graphql_public/hema lo están), así que se necesitan funciones
-- SECURITY DEFINER en public que lean/escriban auth.sessions por dentro.
-- Ambas funciones se revocan de public/anon/authenticated y se otorgan solo
-- a service_role — únicamente nuestro backend (con la service role key) puede
-- invocarlas, nunca el cliente directamente.

create or replace function public.list_sessions_for_user(target_user_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_agent text,
  ip text
)
language sql
security definer
set search_path = public
stable
as $$
  select s.id, s.created_at, s.updated_at, s.user_agent, s.ip::text
  from auth.sessions s
  where s.user_id = target_user_id
  order by s.updated_at desc;
$$;

revoke all on function public.list_sessions_for_user(uuid) from public, anon, authenticated;
grant execute on function public.list_sessions_for_user(uuid) to service_role;

create or replace function public.revoke_user_session(target_user_id uuid, target_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
begin
  delete from auth.sessions
  where id = target_session_id and user_id = target_user_id;
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

revoke all on function public.revoke_user_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_session(uuid, uuid) to service_role;
