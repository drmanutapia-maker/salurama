ALTER TABLE doctors ALTER COLUMN payment_methods TYPE text[] USING ARRAY[]::text[];
