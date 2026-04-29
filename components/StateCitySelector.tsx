'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { STATES, CITIES_BY_STATE } from '@/lib/locations'
import { MapPin, X } from 'lucide-react'

// Función para normalizar texto (quitar acentos)
const normalizarTexto = (texto: string): string => {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

interface StateCitySelectorProps {
  onStateChange?: (state: string) => void
  onCityChange?: (city: string) => void
  initialState?: string
  initialCity?: string
  compact?: boolean
  ciudadesConMedicos?: string[]
}

export default function StateCitySelector({
  onStateChange,
  onCityChange,
  initialState = '',
  initialCity = '',
  compact = false,
  ciudadesConMedicos = []
}: StateCitySelectorProps) {
  const [selectedState, setSelectedState] = useState(initialState)
  const [selectedCity, setSelectedCity] = useState(initialCity)
  const [citySearch, setCitySearch] = useState('')
  const [showCities, setShowCities] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Actualizar estado interno cuando cambien props externas
  useEffect(() => {
    if (initialState && normalizarTexto(initialState) !== normalizarTexto(selectedState)) {
      setSelectedState(initialState)
    }
  }, [initialState])

  useEffect(() => {
    if (initialCity && normalizarTexto(initialCity) !== normalizarTexto(selectedCity)) {
      setSelectedCity(initialCity)
    }
  }, [initialCity])

  // Memoizar ciudades disponibles
  const ciudadesDisponibles = useMemo(() => {
    if (!selectedState) return []
    const ciudadesOficiales = CITIES_BY_STATE[selectedState as keyof typeof CITIES_BY_STATE] || []
    return [...new Set([...ciudadesOficiales, ...ciudadesConMedicos.filter(c => c)])]
  }, [selectedState, ciudadesConMedicos])

  // Memoizar ciudades filtradas
  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return ciudadesDisponibles.slice(0, 10)
    
    const filtradas = ciudadesDisponibles.filter(city =>
      normalizarTexto(city).includes(normalizarTexto(citySearch))
    )
    return filtradas.slice(0, 10)
  }, [citySearch, ciudadesDisponibles])

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCities(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Notificar cambios al padre
  useEffect(() => {
    if (selectedState) {
      onStateChange?.(selectedState)
    }
  }, [selectedState])

  useEffect(() => {
    if (selectedCity) {
      onCityChange?.(selectedCity)
    }
  }, [selectedCity])

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value
    setSelectedState(newState)
    setSelectedCity('')
    setCitySearch('')
  }

  const handleCitySelect = (city: string) => {
    const ciudadValida = ciudadesDisponibles.find(
      c => normalizarTexto(c) === normalizarTexto(city)
    )
    
    if (ciudadValida) {
      setSelectedCity(ciudadValida)
    } else {
      setSelectedCity(city)
    }
    setShowCities(false)
    setCitySearch('')
  }

  const clearSelection = () => {
    setSelectedState('')
    setSelectedCity('')
    setCitySearch('')
  }

  const padding = compact ? '12px 16px' : '18px 24px'
  const fontSize = compact ? 14 : 15

  return (
    <div ref={dropdownRef} style={{ flex: '0 1 250px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Selector de Estado */}
      <select
        value={selectedState}
        onChange={handleStateChange}
        style={{
          width: '100%',
          padding,
          borderRadius: 16,
          border: '1.5px solid #2A9D8F',
          fontSize,
          fontFamily: "'DM Sans', sans-serif",
          background: '#fff',
          cursor: 'pointer',
          outline: 'none',
          transition: 'border-color 0.2s'
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#8B5CF6')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#2A9D8F')}
      >
        <option value="">Todos los estados</option>
        {STATES.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>

      {/* Selector de Ciudad */}
      {selectedState && (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Ciudad..."
            value={citySearch || selectedCity}
            onChange={(e) => {
              setCitySearch(e.target.value)
              setShowCities(true)
              setSelectedCity('')
            }}
            onFocus={() => setShowCities(true)}
            style={{
              width: '100%',
              padding,
              paddingRight: 40,
              borderRadius: 16,
              border: '1.5px solid #2A9D8F',
              fontSize,
              fontFamily: "'DM Sans', sans-serif",
              background: '#fff',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#8B5CF6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#2A9D8F')}
          />

          {(selectedCity || citySearch) && (
            <button
              onClick={clearSelection}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9CA3AF',
                padding: 4
              }}
            >
              <X size={16} />
            </button>
          )}

          {/* Dropdown de ciudades */}
          {showCities && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 8,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                maxHeight: 300,
                overflow: 'auto',
                zIndex: 100
              }}
            >
              {filteredCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    borderBottom: '1px solid #F3F4F6'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F5F3FF'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                  }}
                >
                  {city}
                </button>
              ))}
              
              {filteredCities.length === 0 && citySearch && (
                <div
                  style={{
                    padding: '16px',
                    fontSize: 14,
                    color: '#6B7280',
                    textAlign: 'center'
                  }}
                >
                  Ciudad no encontrada
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}