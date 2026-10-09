export interface Cita {
  id: string
  paciente_id: string | null
  paciente_nombre: string
  paciente_email: string
  paciente_telefono: string
  fecha: string
  hora: string
  motivo: string | null
  estado: 'pending_verification' | 'confirmed' | 'completed' | 'cancelled' | 'cancelada_paciente'
  created_at: string
  completed_at?: string | null
  review_token?: string | null
  rejection_reason?: string | null
  consultorio_id?: string | null
  consultorio?: { nombre: string | null; whatsapp_recepcion?: string | null } | null
}

export interface MedicoData {
  id: string
  full_name: string
  specialty: string
}
