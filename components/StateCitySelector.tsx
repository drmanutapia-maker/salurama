'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { STATES, getStateLabel } from '@/lib/locations'
import { MapPin, X, ChevronDown, Loader2 } from 'lucide-react'
import { createPortal } from 'react-dom'

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

interface Props {
  onStateChange?: (state: string) => void
  onCityChange?: (city: string) => void
  initialState?: string
  initialCity?: string
  compact?: boolean
}

export default function StateCitySelector({
  onStateChange,
  onCityChange,
  initialState = '',
  initialCity = '',
  compact = false
}: Props) {
  const [state, setState] = useState(initialState)
  const [city, setCity] = useState(initialCity)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const [mounted, setMounted] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (initialState) setState(initialState) }, [initialState])
  useEffect(() => { if (initialCity) { setCity(initialCity); setQuery(initialCity) } }, [initialCity])

  // Cargar ciudades desde API
  useEffect(() => {
    if (!state || query.length < 2) { setCities([]); return }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/ciudades?estado=${encodeURIComponent(state)}&q=${encodeURIComponent(query)}`,
          { signal: abortRef.current?.signal }
        )
        const data = await res.json()
        setCities(data)
      } catch (e) {
        if ((e as Error).name!== 'AbortError') setCities([])
      } finally {
        setLoading(false)
      }
    }, 150)

    return () => { clearTimeout(timer); abortRef.current?.abort() }
  }, [state, query])

  const updatePosition = useCallback(() => {
    if (inputRef.current && open) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }, [open])

  useEffect(() => {
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [updatePosition])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current &&!containerRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement
        if (!target.closest('[data-city-dropdown]')) setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
    inputRef.current?.blur()
  }, [])

  const handleInputChange = useCallback((val: string) => {
    setQuery(val)
    setOpen(val.length >= 2)
    if (val!== city) setCity('')
  }, [city])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && cities.length > 0) {
      e.preventDefault()
      handleCity(cities[0])
    }
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }, [cities, handleCity])

  const clearCity = useCallback(() => {
    setCity('')
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }, [])

  const size = compact? 'h-11 text-sm' : 'h- text-'

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2.5 w-full">
        <div className="relative flex-1 min-w-0">
          <select
            value={state}
            onChange={e => handleState(e.target.value)}
            className={`${size} w-full appearance-none rounded-2xl border-[1.5px] border-zinc-200 bg-white pl-4 pr-10 outline-none transition-all hover:border-zinc-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 cursor-pointer font-medium text-zinc-700`}
          >
            <option value="">Todo México</option>
            {STATES.map(s => (
              <option key={s} value={s}>{getStateLabel(s)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        </div>

        {state && (
          <div ref={containerRef} className="relative flex-1 min-w-0">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w- h- text-zinc-400 z-10" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => query.length >= 2 && setOpen(true)}
              placeholder="Ciudad o municipio..."
              className={`${size} w-full rounded-2xl border-[1.5px] border-zinc-200 bg-white pl-10 pr-10 outline-none transition-all hover:border-zinc-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 font-medium text-zinc-700 placeholder:text-zinc-400`}
              autoComplete="off"
            />
            {(city || query) && (
              <button
                type="button"
                onClick={clearCity}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center w-7 h-7 rounded-full hover:bg-zinc-100 active:bg-zinc-200 transition-colors z-10"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            )}
          </div>
        )}
      </div>

      {open && state && mounted && createPortal(
        <div data-city-dropdown style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-black/5">
            <div className="max-h- overflow-auto overscroll-contain bg-white">
              {loading? (
                <div className="flex items-center justify-center py-8 gap-2 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Buscando...</span>
                </div>
              ) : cities.length > 0? (
                <>
                  <div className="sticky top-0 px-3 py-2 text- font-medium text-zinc-500 bg-zinc-50/90 backdrop-blur border-b border-zinc-100">
                    {cities.length} {cities.length === 1? 'coincidencia' : 'coincidencias'}
                  </div>
                  {cities.map((c) => {
                    const q = normalize(query)
                    const name = normalize(c)
                    const startIdx = name.indexOf(q)

                    return (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleCity(c) }}
                        className="w-full text-left px-4 h- text- hover:bg-violet-50 active:bg-violet-100 transition-colors text-zinc-800 flex items-center gap-3 group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 group-hover:bg-violet-100 flex items-center justify-center flex-shrink-0 transition-colors">
                          <MapPin size={13} className="text-zinc-500 group-hover:text-violet-600" />
                        </div>
                        <span className="truncate">
                          {startIdx >= 0 && query? (
                            <>
                              {c.substring(0, startIdx)}
                              <span className="font-semibold text-violet-700">{c.substring(startIdx, startIdx + query.length)}</span>
                              {c.substring(startIdx + query.length)}
                            </>
                          ) : c}
                        </span>
                      </button>
                    )
                  })}
                </>
              ) : query.length >= 2? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-zinc-600">Sin coincidencias para "{query}"</p>
                  <p className="text-xs text-zinc-500 mt-1">Intenta con otro nombre</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}