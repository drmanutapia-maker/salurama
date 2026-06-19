export interface ProfileCompletionData {
  medico: {
    photo_url?: string | null
    about_me?: string | null
    clinic_lat?: number | null
    clinic_lng?: number | null
    horario?: Record<string, any> | null
    consultation_price_first_time?: number | null
    consultation_price_general?: number | null
    phone?: string | null
    clinic_phone?: string | null
    whatsapp_phone?: string | null
    languages?: string[] | null
  } | null
  experienceCount: number
  educationCount: number
  conditionsCount: number
}

export interface ProfileCheck {
  label: string
  ok: boolean
}

export function calculateProfileCompletion(data: ProfileCompletionData): {
  checks: ProfileCheck[]
  percentage: number
} {
  const { medico, experienceCount, educationCount, conditionsCount } = data

  const tieneHorarioActivo = !!(medico?.horario && Object.values(medico.horario).some((d: any) => d?.activo || d?.abierto))
  const tieneUbicacionVerificada = !!(medico?.clinic_lat && medico?.clinic_lng)
  const tieneTelefono = !!(medico?.phone || medico?.clinic_phone || medico?.whatsapp_phone)

  const checks: ProfileCheck[] = [
    { label: 'Foto de perfil', ok: !!medico?.photo_url },
    { label: 'Biografía', ok: !!(medico?.about_me && medico.about_me.length > 100) },
    { label: 'Ubicación verificada', ok: tieneUbicacionVerificada },
    { label: 'Horario de consulta', ok: tieneHorarioActivo },
    { label: 'Precios', ok: !!(medico?.consultation_price_first_time && medico?.consultation_price_general) },
    { label: 'Teléfono de contacto', ok: tieneTelefono },
    { label: 'Idiomas', ok: !!(Array.isArray(medico?.languages) && medico.languages.length >= 1) },
    { label: 'Experiencia profesional', ok: experienceCount > 0 },
    { label: 'Formación académica', ok: educationCount > 0 },
    { label: 'Enfermedades que trata', ok: conditionsCount > 0 },
  ]

  const percentage = Math.round((checks.filter(c => c.ok).length / checks.length) * 100)

  return { checks, percentage }
}