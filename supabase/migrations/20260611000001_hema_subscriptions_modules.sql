-- HEMA Módulo: Suscripciones – campo modules
-- Afecta schema: public (modificación mínima a tabla existente de Salurama)
-- Reversión: ALTER TABLE public.subscriptions DROP COLUMN modules;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS modules text[] DEFAULT '{}';

COMMENT ON COLUMN public.subscriptions.modules IS
  'Módulos clínicos activos para este médico (ej: hema, onco, reuma)';
