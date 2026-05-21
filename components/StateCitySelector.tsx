'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { STATES, CITIES_BY_STATE } from '@/lib/locations'
import { MapPin, X, ChevronDown } from 'lucide-react'

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

interface Props {
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
}: Props) {
  const [state, setState] = useState(initialState)
  const [city, setCity] = useState(initialCity)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Sync with props
  useEffect(() => { if (initialState) setState(initialState) }, [initialState])
  useEffect(() => { if (initialCity) setCity(initialCity) }, [initialCity])

  // Cities
  const cities = useMemo(() => {
    if (!state) return []
    const base = CITIES_BY_STATE[state as keyof typeof CITIES_BY_STATE] || []
    return [...new Set([...base,...ciudadesConMedicos])].sort()
  }, [state, ciudadesConMedicos])

  const filtered = useMemo(() => {
    if (!query) return cities.slice(0, 8)
    return cities.filter(c => normalize(c).includes(normalize(query))).slice(0, 8)
  }, [query, cities])

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current &&!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Notify parent
  useEffect(() => { onStateChange?.(state) }, [state, onStateChange])
  useEffect(() => { onCityChange?.(city) }, [city, onCityChange])

  const handleState = useCallback((newState: string) => {
    setState(newState)
    setCity('')
    setQuery('')
    setOpen(false)
  }, [])

  const handleCity = useCallback((selected: string) => {
    setCity(selected)
    setQuery(selected)
    setOpen(false)
  }, [])

  const clear = useCallback(() => {
    setState('')
    setCity('')
    setQuery('')
  }, [])

  const size = compact? 'h-11 text- px-3.5' : 'h- text- px-4'

  return (
    <div className="flex flex-col sm:flex-row gap-2.5 w-full">
      {/* Estado */}
      <div className="relative flex-1 min-w-">
        <select
          value={state}
          onChange={e => handleState(e.target.value)}
          className={`${size} w-full appearance-none rounded-2xl border border-zinc-200 bg-white pr-9 outline-none transition-all hover:border-zinc-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 cursor-pointer`}
        >
          <option value="">Todo México</option>
          {STATES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
      </div>

      {/* Ciudad */}
      {state && (
        <div ref={ref} className="relative flex-1 min-w-">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={open? query : city || query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setCity('') }}
            onFocus={() => setOpen(true)}
            placeholder="Ciudad..."
            className={`${size} w-full rounded-2xl border border-zinc-200 bg-white pl-9 pr-9 outline-none transition-all hover:border-zinc-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10`}
          />

          {(city || query) && (
            <button
              onClick={clear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          )}

          {open && (
            <div className="absolute z-50 top-[calc(100%+6px)] inset-x-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-black/5 animate-in fade-in slide-in-from-top-1">
              <div className="max-h- overflow-auto p-1.5">
                {filtered.length > 0? filtered.map(c => (
                  <button
                    key={c}
                    onClick={() => handleCity(c)}
                    className="w-full text-left px-3 h-9 rounded-xl text- hover:bg-zinc-50 transition-colors"
                  >
                    {c}
                  </button>
                )) : (
                  <div className="px-3 py-6 text-center text- text-zinc-500">
                    No se encontró
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}