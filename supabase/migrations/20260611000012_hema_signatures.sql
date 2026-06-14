-- HEMA Módulo: Firmas NOM-151
-- Afecta schema: hema
-- Reversión: DROP TABLE hema.signatures CASCADE;

CREATE TABLE hema.signatures (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                   uuid        NOT NULL REFERENCES hema.orders(id),
  user_id                    uuid        NOT NULL REFERENCES hema.users(id),
  psc_provider               text        NOT NULL,
  psc_document_id            text        NOT NULL,
  signed_hash                text        NOT NULL,
  constancia_de_conservacion bytea,
  signed_at                  timestamptz NOT NULL
);

COMMENT ON TABLE hema.signatures IS
  'Firmas electrónicas avanzadas NOM-151 de cada indicación. '
  'Un order_id puede tener hasta 2 firmas (médico + co-firmante en overrides críticos).';

COMMENT ON COLUMN hema.signatures.psc_provider IS
  'Proveedor de Servicios de Certificación acreditado ante SE: ''mifiel'' o ''advantage''.';

COMMENT ON COLUMN hema.signatures.psc_document_id IS
  'ID del documento en el PSC (ej: UUID de Mifiel). '
  'Permite recuperar la constancia directamente desde el PSC si se pierde la copia local.';

COMMENT ON COLUMN hema.signatures.signed_hash IS
  'Hash SHA-256 del PDF en el momento de la firma. '
  'Debe coincidir con hema.orders.pdf_sha256 para que la verificación sea válida.';

COMMENT ON COLUMN hema.signatures.constancia_de_conservacion IS
  'Archivo binario de la constancia RFC 3161 emitida por el PSC. '
  'Contiene sello de tiempo + listas de revocación (OCSP/CRL). '
  'Almacenado aquí además de hema-order-pdfs/ como respaldo.';
