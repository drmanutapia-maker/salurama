-- Chat médico-paciente, Paso 2: tablas del chat (salas, mensajes, archivos)
-- Afecta: 3 tablas nuevas; 1 función + trigger en citas para mantener
-- chat_salas.cita_actual_id al vuelo; 1 función sesion_cerrada() usada en RLS.
--
-- Reversión:
--   DROP TRIGGER IF EXISTS trg_citas_actualizar_chat_sala ON citas;
--   DROP FUNCTION IF EXISTS actualizar_chat_sala_cita();
--   DROP FUNCTION IF EXISTS sesion_cerrada(uuid);
--   DROP TABLE IF EXISTS chat_archivos;
--   DROP TABLE IF EXISTS chat_mensajes;
--   DROP TABLE IF EXISTS chat_salas;

-- ── chat_salas ───────────────────────────────────────────────────────────
CREATE TABLE chat_salas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES doctors(id),
  paciente_id uuid NOT NULL REFERENCES pacientes(id),
  cita_actual_id uuid NOT NULL REFERENCES citas(id),
  token_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (medico_id, paciente_id)
);
CREATE INDEX idx_chat_salas_paciente_id ON chat_salas(paciente_id);
CREATE UNIQUE INDEX idx_chat_salas_token_hash ON chat_salas(token_hash) WHERE token_hash IS NOT NULL;

COMMENT ON TABLE chat_salas IS
  'Hilo continuo médico-paciente. Una fila por pareja (medico_id, paciente_id); '
  'cita_actual_id apunta a la sesión vigente. Base del chat médico-paciente (Paso 2 de 8).';
COMMENT ON COLUMN chat_salas.token_hash IS
  'Huella (hash) del link de acceso del paciente. Nunca el link/token real. '
  'NULL hasta que el backend recepcionista (Paso 3) lo emite.';

-- ── chat_mensajes ────────────────────────────────────────────────────────
CREATE TABLE chat_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id uuid NOT NULL REFERENCES chat_salas(id),
  cita_id uuid NOT NULL REFERENCES citas(id),
  remitente_tipo text NOT NULL CHECK (remitente_tipo IN ('medico', 'paciente')),
  medico_id uuid REFERENCES doctors(id),
  contenido text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (remitente_tipo = 'medico' AND medico_id IS NOT NULL) OR
    (remitente_tipo = 'paciente' AND medico_id IS NULL)
  )
);
CREATE INDEX idx_chat_mensajes_sala_id ON chat_mensajes(sala_id, created_at);
CREATE INDEX idx_chat_mensajes_cita_id ON chat_mensajes(cita_id);

COMMENT ON TABLE chat_mensajes IS
  'Mensajes de coordinación del chat médico-paciente. Nunca se editan ni se '
  'borran (NOM-004 exige conservación >=5 años). cita_id agrupa visualmente '
  'por sesión dentro del hilo continuo de chat_salas.';

-- ── chat_archivos ────────────────────────────────────────────────────────
CREATE TABLE chat_archivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id uuid NOT NULL REFERENCES chat_salas(id),
  cita_id uuid NOT NULL REFERENCES citas(id),
  remitente_tipo text NOT NULL CHECK (remitente_tipo IN ('medico', 'paciente')),
  medico_id uuid REFERENCES doctors(id),
  storage_path text NOT NULL,
  nombre_original text NOT NULL,
  tipo_mime text NOT NULL,
  tamano_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (remitente_tipo = 'medico' AND medico_id IS NOT NULL) OR
    (remitente_tipo = 'paciente' AND medico_id IS NULL)
  )
);
CREATE INDEX idx_chat_archivos_sala_id ON chat_archivos(sala_id, created_at);
CREATE INDEX idx_chat_archivos_cita_id ON chat_archivos(cita_id);

COMMENT ON TABLE chat_archivos IS
  'Archivos médicos del chat médico-paciente (referencia trazable/permanente, '
  'separado de chat_mensajes). Nunca se editan ni se borran. storage_path '
  'apunta a Supabase Storage.';

-- ── sesion_cerrada(cita) ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sesion_cerrada(p_cita_id uuid)
RETURNS boolean AS $$
  SELECT c.estado = 'cancelled'
      OR (c.estado = 'completed' AND now() > c.completed_at + interval '72 hours')
  FROM citas c
  WHERE c.id = p_cita_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION sesion_cerrada(uuid) IS
  'true si la sesión (cita) ya no admite escritura del médico: cancelada, o '
  'completada hace más de 72 horas. NULL (cita inexistente, o completada sin '
  'completed_at por ser anterior al Paso 1) se evalúa como cerrada en RLS.';

-- ── mantener chat_salas.cita_actual_id al agendar ───────────────────────
CREATE OR REPLACE FUNCTION actualizar_chat_sala_cita()
RETURNS trigger AS $$
BEGIN
  INSERT INTO chat_salas (medico_id, paciente_id, cita_actual_id)
  VALUES (NEW.medico_id, NEW.paciente_id, NEW.id)
  ON CONFLICT (medico_id, paciente_id)
  DO UPDATE SET cita_actual_id = EXCLUDED.cita_actual_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_citas_actualizar_chat_sala
AFTER INSERT ON citas
FOR EACH ROW EXECUTE FUNCTION actualizar_chat_sala_cita();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE chat_salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_archivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_salas_medico_select ON chat_salas
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM doctors d WHERE d.id = chat_salas.medico_id AND d.user_id = auth.uid()
));

CREATE POLICY chat_mensajes_medico_select ON chat_mensajes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM chat_salas cs
  JOIN doctors d ON d.id = cs.medico_id
  WHERE cs.id = chat_mensajes.sala_id AND d.user_id = auth.uid()
));

CREATE POLICY chat_mensajes_medico_insert ON chat_mensajes
FOR INSERT
WITH CHECK (
  remitente_tipo = 'medico'
  AND EXISTS (
    SELECT 1 FROM chat_salas cs
    JOIN doctors d ON d.id = cs.medico_id
    JOIN citas c ON c.id = chat_mensajes.cita_id
    WHERE cs.id = chat_mensajes.sala_id
      AND d.user_id = auth.uid()
      AND chat_mensajes.medico_id = d.id
      AND c.medico_id = d.id
      AND c.paciente_id = cs.paciente_id
      AND NOT sesion_cerrada(c.id)
  )
);

CREATE POLICY chat_archivos_medico_select ON chat_archivos
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM chat_salas cs
  JOIN doctors d ON d.id = cs.medico_id
  WHERE cs.id = chat_archivos.sala_id AND d.user_id = auth.uid()
));

CREATE POLICY chat_archivos_medico_insert ON chat_archivos
FOR INSERT
WITH CHECK (
  remitente_tipo = 'medico'
  AND EXISTS (
    SELECT 1 FROM chat_salas cs
    JOIN doctors d ON d.id = cs.medico_id
    JOIN citas c ON c.id = chat_archivos.cita_id
    WHERE cs.id = chat_archivos.sala_id
      AND d.user_id = auth.uid()
      AND chat_archivos.medico_id = d.id
      AND c.medico_id = d.id
      AND c.paciente_id = cs.paciente_id
      AND NOT sesion_cerrada(c.id)
  )
);
