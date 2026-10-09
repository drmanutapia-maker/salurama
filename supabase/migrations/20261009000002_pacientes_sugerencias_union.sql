-- Tabla para avisos de posible duplicado, generados por vincular_paciente_cita().
-- El médico los revisa en el dashboard y decide si unir o ignorar.

CREATE TABLE IF NOT EXISTS pacientes_sugerencias_union (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id             uuid NOT NULL,
  cita_id               uuid,  -- NULL cuando viene del trigger (BEFORE INSERT, FK no resuelta aún)
  paciente_nuevo_id     uuid NOT NULL REFERENCES pacientes(id),
  paciente_existente_id uuid NOT NULL REFERENCES pacientes(id),
  tipo_coincidencia     text NOT NULL
    CHECK (tipo_coincidencia IN (
      'email_y_telefono_mismo_nombre',
      'email_y_telefono_nombre_diferente',
      'solo_email',
      'solo_telefono'
    )),
  revisado              boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_psu_medico_revisado
  ON pacientes_sugerencias_union(medico_id, revisado)
  WHERE revisado = false;

ALTER TABLE pacientes_sugerencias_union ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medico_lee_sus_sugerencias"
  ON pacientes_sugerencias_union
  FOR SELECT
  USING (medico_id = auth.uid());
