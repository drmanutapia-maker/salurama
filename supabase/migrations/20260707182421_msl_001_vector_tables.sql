-- Reconstruido retroactivamente (2026-07-24) para sincronizar git con la bitácora
-- remota de Supabase — este cambio ya estaba aplicado en producción desde 2026-07-07,
-- solo faltaba el archivo local. Ver diagnóstico de desincronización de migraciones.
-- Contenido extraído tal cual de supabase_migrations.schema_migrations.statements.

-- ============================================================
-- MIGRACIÓN MSL-001: Base vectorial para MSL Virtual
-- ============================================================

-- 1. Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla de documentos fuente (papers)
CREATE TABLE IF NOT EXISTS msl_documents (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  authors     TEXT,
  journal     TEXT,
  year        INT,
  doi         TEXT,
  specialty   TEXT        NOT NULL DEFAULT 'hematologia',
  pathology   TEXT        NOT NULL DEFAULT 'mieloma_multiple',
  sponsor     TEXT,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de chunks con embeddings
CREATE TABLE IF NOT EXISTS msl_chunks (
  id           UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id  UUID  NOT NULL REFERENCES msl_documents(id) ON DELETE CASCADE,
  chunk_index  INT   NOT NULL,
  content      TEXT  NOT NULL,
  embedding    vector(1536),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 4. Índice de similitud coseno
CREATE INDEX ON msl_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- 5. RLS
ALTER TABLE msl_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE msl_chunks    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read documents" ON msl_documents;
CREATE POLICY "Authenticated can read documents"
  ON msl_documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can read chunks" ON msl_chunks;
CREATE POLICY "Authenticated can read chunks"
  ON msl_chunks FOR SELECT TO authenticated USING (true);

-- 6. Función de búsqueda semántica
CREATE OR REPLACE FUNCTION match_msl_chunks(
  query_embedding  vector(1536),
  match_threshold  FLOAT DEFAULT 0.5,
  match_count      INT   DEFAULT 5
)
RETURNS TABLE (
  id           UUID,
  document_id  UUID,
  content      TEXT,
  similarity   FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM msl_chunks c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
