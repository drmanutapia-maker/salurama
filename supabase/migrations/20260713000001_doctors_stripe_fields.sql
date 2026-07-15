-- Campos para suscripciones de Stripe en doctors.pricing_tier.
-- pricing_tier ya existe y no cambia (sigue siendo 'gratis' | '349' | '799' | '1999').
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS pricing_period text CHECK (pricing_period IN ('monthly', 'annual'));
