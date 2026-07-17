'use client'

// Nunca asumir un título (ej. "Dr.") por defecto — inferir por nombre
// tiene riesgo real de error y de fricción social. Siempre debe elegirse
// explícitamente; sin selección, el placeholder debe ser neutro.
const TITLE_OPTIONS = ['Dr.', 'Dra.', 'Mtro.', 'Mtra.'] as const

interface TitleSelectProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
  style?: React.CSSProperties
  className?: string
}

export default function TitleSelect({ value, onChange, required, style, className }: TitleSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={className}
      style={style ?? { width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, background: '#fff' }}
    >
      <option value="" disabled>Selecciona un título</option>
      {TITLE_OPTIONS.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  )
}
