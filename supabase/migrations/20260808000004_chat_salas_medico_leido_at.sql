-- Marca de "leído" del médico por sala de chat. El badge de mensajes sin
-- leer (lib/chat/sinLeer.ts) usaba solo el último mensaje del médico como
-- umbral, así que si el médico solo leía sin responder, el badge nunca se
-- limpiaba. Este timestamp se actualiza cada vez que el médico abre/consulta
-- la conversación (app/api/chat/medico/sesion/route.ts) y se combina con el
-- umbral existente (el más reciente de los dos gana).
alter table public.chat_salas
  add column if not exists medico_leido_at timestamptz null;
