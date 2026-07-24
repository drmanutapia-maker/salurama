-- Reconstruido retroactivamente (2026-07-24) para sincronizar git con la bitácora
-- remota de Supabase — este cambio ya estaba aplicado en producción desde 2026-07-15,
-- solo faltaba el archivo local. Ver diagnóstico de desincronización de migraciones.
-- Contenido extraído tal cual de supabase_migrations.schema_migrations.statements.
-- Corrige la latencia de búsqueda semántica en MSL Virtual (índice ivfflat de
-- msl_001_vector_tables reemplazado por hnsw).

DROP INDEX IF EXISTS msl_chunks_embedding_idx;
CREATE INDEX msl_chunks_embedding_idx ON msl_chunks USING hnsw (embedding vector_cosine_ops);
