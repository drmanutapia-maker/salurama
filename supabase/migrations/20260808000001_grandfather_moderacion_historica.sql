-- Bug encontrado al probar el cron de respaldo (moderacion-pendiente): la
-- columna moderation_status se agregó con DEFAULT 'pendiente_revision_ia',
-- así que TODAS las reseñas/respuestas creadas antes de que existiera esta
-- función (meses de contenido histórico legítimo, ya público sin incidentes)
-- quedaron marcadas como "pendientes". El cron de respaldo, al barrer
-- cualquier cosa vieja en ese estado, las evaluaría con IA sin que nadie lo
-- haya pedido — y de hecho ya marcó por error una reseña real como
-- "señalado" en pruebas (corregida a mano antes de esta migración).
--
-- Fix: todo lo que sigue en pendiente_revision_ia y tiene más de 24h de
-- antigüedad se da por aprobado retroactivamente (24h es muchísimo más que
-- el umbral de 15 min del cron de respaldo — para entonces, cualquier
-- contenido genuinamente nuevo ya debería estar evaluado). Esto NO afecta
-- contenido nuevo en curso, solo backlog histórico anterior a esta función.

UPDATE public.reviews
SET moderation_status = 'aprobado'
WHERE moderation_status = 'pendiente_revision_ia'
  AND created_at < now() - interval '24 hours';

UPDATE public.review_responses
SET moderation_status = 'aprobado'
WHERE moderation_status = 'pendiente_revision_ia'
  AND created_at < now() - interval '24 hours';
