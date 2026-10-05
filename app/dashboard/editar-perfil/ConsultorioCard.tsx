'use client'
import { MapPin, Edit2, Power, Trash2 } from 'lucide-react'

export interface ConsultorioRow {
  id: string
  nombre: string | null
  tipo: string | null
  street: string | null
  ext_number: string | null
  int_number: string | null
  floor: string | null
  cp: string | null
  colonia: string | null
  ciudad: string | null
  estado: string | null
  formatted_address: string | null
  lat: number | null
  lng: number | null
  telefono: string | null
  telefono_visible: boolean
  horario: Record<string, any> | null
  es_principal: boolean
  activo: boolean
  orden: number
}

interface Props {
  consultorio: ConsultorioRow
  esPrincipal: boolean
  index: number
  onEdit: () => void
  onToggleActivo: () => void
  onDelete: () => void
  guardando?: boolean
}

const label = (esPrincipal: boolean, index: number) =>
  esPrincipal ? 'Consultorio principal' : `Consultorio ${index + 1}`

export default function ConsultorioCard({ consultorio, esPrincipal, index, onEdit, onToggleActivo, onDelete, guardando }: Props) {
  const nombre = consultorio.nombre || label(esPrincipal, index)
  const lugar = [consultorio.ciudad, consultorio.estado].filter(Boolean).join(', ')
  const tieneUbicacion = consultorio.lat != null && consultorio.lng != null

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '14px 0',
      borderBottom: '1px solid #F3F4F6',
    }}>
      {/* Ícono */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: esPrincipal ? '#E8F7F5' : '#F3F4F6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
      }}>
        <MapPin size={18} color={esPrincipal ? '#2A9D8F' : '#6B7280'} />
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{nombre}</p>
          {esPrincipal && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2A9D8F', background: '#E8F7F5', borderRadius: 20, padding: '2px 8px' }}>
              Principal
            </span>
          )}
          {!consultorio.activo && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', background: '#F3F4F6', borderRadius: 20, padding: '2px 8px' }}>
              Inactivo
            </span>
          )}
        </div>
        {lugar && <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 0' }}>{lugar}</p>}
        {!tieneUbicacion && (
          <p style={{ fontSize: 12, color: '#F59E0B', margin: '4px 0 0', fontWeight: 600 }}>
            Sin coordenadas · no aparece en "Cerca de mí"
          </p>
        )}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        <button
          onClick={onEdit}
          disabled={guardando}
          title="Editar"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 8,
            padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            color: '#1E3A5F', fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Edit2 size={13} /> Editar
        </button>

        {!esPrincipal && (
          <>
            <button
              onClick={onToggleActivo}
              disabled={guardando}
              title={consultorio.activo ? 'Desactivar' : 'Activar'}
              style={{
                display: 'inline-flex', alignItems: 'center',
                background: consultorio.activo ? '#FEF3C7' : '#E8F7F5',
                border: `1.5px solid ${consultorio.activo ? '#FCD34D' : '#6EE7B7'}`,
                borderRadius: 8, padding: '6px 10px', fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
                color: consultorio.activo ? '#92400E' : '#065F46',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Power size={13} />
            </button>

            <button
              onClick={() => {
                if (confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) onDelete()
              }}
              disabled={guardando}
              title="Eliminar"
              style={{
                display: 'inline-flex', alignItems: 'center',
                background: '#FEF2F2', border: '1.5px solid #FECACA',
                borderRadius: 8, padding: '6px 10px', fontSize: 12,
                fontWeight: 600, cursor: 'pointer', color: '#DC2626',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
