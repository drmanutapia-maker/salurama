'use client'

import { useState, useEffect, useRef } from 'react'
import { stripDiacritics } from '@/lib/normalizeText'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputStyle?: React.CSSProperties
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>
  const normalizedText = stripDiacritics(text).toLowerCase()
  const normalizedQuery = stripDiacritics(query).toLowerCase()
  const idx = normalizedText.indexOf(normalizedQuery)
  if (idx === -1) return <span>{text}</span>
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: '#1E3A5F', fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function EspecialidadAutocomplete({
  value, onChange, placeholder, className, inputStyle
}: Props) {
  const [todas, setTodas] = useState<string[]>([])
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Carga única al montar
  useEffect(() => {
    fetch('/api/especialidades')
      .then(r => r.json())
      .then(data => setTodas(data.especialidades ?? []))
      .catch(() => {})
  }, [])

  // Filtrado en cliente — inicio de palabra, sin tildes
  useEffect(() => {
    if (!value.trim() || todas.length === 0) {
      setSugerencias([])
      setOpen(false)
      return
    }
    const q = stripDiacritics(value.toLowerCase())
    const filtered = todas
      .filter(esp => {
        const norm = stripDiacritics(esp.toLowerCase())
        return norm.startsWith(q) || norm.includes(' ' + q)
      })
      .slice(0, 8)
    setSugerencias(filtered)
    setActiveIndex(-1)
    setOpen(filtered.length > 0)
  }, [value, todas])

  // Cierre al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (esp: string) => {
    onChange(esp)
    setOpen(false)
    setSugerencias([])
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, sugerencias.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      select(sugerencias[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => sugerencias.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        style={{ width: '100%', ...inputStyle }}
        autoComplete="off"
      />
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          zIndex: 1000,
          maxHeight: 320,
          overflowY: 'auto',
          marginTop: 4,
        }}>
          {sugerencias.map((esp, i) => (
            <div
              key={esp}
              onMouseDown={() => select(esp)}
              style={{
                padding: '10px 12px',
                minHeight: 44,
                display: 'block',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                lineHeight: '1.4',
                fontSize: 14,
                cursor: 'pointer',
                background: i === activeIndex ? '#EEF2FF' : 'transparent',
                color: '#111827',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'background 0.1s',
              }}
            >
              {highlight(esp, value)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
