'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

interface HorarioDia {
  activo: boolean
  inicio: string
  fin: string
  descanso_inicio?: string
  descanso_fin?: string
}

type Horario = Record<DiaSemana, HorarioDia>

const DIAS: { key: DiaSemana; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0? '00' : '30'
  return `${h}:${m}`
})

export default function HorarioDoctor() {
  const [horario, setHorario] = useState<Horario | null>(null)
  const [duracion, setDuracion] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadHorario()
  }, [])

  const loadHorario = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: doctor } = await supabase
     .from('doctors')
     .select('horario, duracion_cita_minutos')
     .eq('user_id', user.id)
     .single()

    if (doctor?.horario) {
      setHorario(doctor.horario)
      setDuracion(doctor.duracion_cita_minutos || 30)
    }
    setLoading(false)
  }

  const updateDia = (dia: DiaSemana, campo: keyof HorarioDia, valor: any) => {
    if (!horario) return
    setHorario({
     ...horario,
      [dia]: {...horario[dia], [campo]: valor }
    })
    setHasChanges(true)
  }

  const toggleDia = (dia: DiaSemana) => {
    updateDia(dia, 'activo',!horario![dia].activo)
  }

  const copiarATodos = (diaOrigen: DiaSemana) => {
    if (!horario) return
    const origen = horario[diaOrigen]
    const nuevo = {...horario }
    DIAS.forEach(({ key }) => {
      if (key!== diaOrigen) {
        nuevo[key] = {...origen }
      }
    })
    setHorario(nuevo)
    setHasChanges(true)
    toast.success('Horario copiado a todos los días')
  }

  const guardar = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
     .from('doctors')
     .update({
        horario,
        duracion_cita_minutos: duracion,
        updated_at: new Date().toISOString()
      })
     .eq('user_id', user!.id)

    setSaving(false)
    if (error) {
      toast.error('Error al guardar')
    } else {
      toast.success('Horario actualizado')
      setHasChanges(false)
    }
  }

  // Auto-guardado después de 2 segundos sin cambios
  useEffect(() => {
    if (!hasChanges ||!horario) return
    const timer = setTimeout(() => guardar(), 2000)
    return () => clearTimeout(timer)
  }, [horario, duracion, hasChanges])

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Horario de atención</h1>
        <p className="text-gray-600 mt-1">Define cuándo pueden agendar citas tus pacientes</p>
      </div>

      {/* Configuración rápida */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-medium mb-4">Configuración general</h2>
        <div className="flex items-center gap-4">
          <label className="text-sm">Duración de cada cita:</label>
          <select
            value={duracion}
            onChange={(e) => { setDuracion(Number(e.target.value)); setHasChanges(true) }}
            className="border rounded-lg px-3 py-2"
          >
            <option value={15}>15 minutos</option>
            <option value={20}>20 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>60 minutos</option>
          </select>
        </div>
      </div>

      {/* Horario por día */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {DIAS.map(({ key, label }) => {
          const dia = horario![key]
          return (
            <div key={key} className="border-b last:border-0 p-5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 w-32">
                  <button
                    onClick={() => toggleDia(key)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      dia.activo? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      dia.activo? 'translate-x-5' : ''
                    }`} />
                  </button>
                  <span className={`font-medium ${!dia.activo? 'text-gray-400' : ''}`}>{label}</span>
                </div>

                {dia.activo? (
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <select
                      value={dia.inicio}
                      onChange={(e) => updateDia(key, 'inicio', e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm"
                    >
                      {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="text-gray-400">—</span>
                    <select
                      value={dia.fin}
                      onChange={(e) => updateDia(key, 'fin', e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm"
                    >
                      {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>

                    <button
                      onClick={() => copiarATodos(key)}
                      className="ml-4 text-xs text-blue-600 hover:text-blue-700"
                    >
                      Copiar a todos
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">No disponible</span>
                )}
              </div>

              {/* Descanso opcional */}
              {dia.activo && (
                <div className="mt-3 ml-16 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!dia.descanso_inicio}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateDia(key, 'descanso_inicio', '14:00')
                        updateDia(key, 'descanso_fin', '15:00')
                      } else {
                        updateDia(key, 'descanso_inicio', undefined)
                        updateDia(key, 'descanso_fin', undefined)
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-600">Agregar hora de comida</span>
                  {dia.descanso_inicio && (
                    <>
                      <select
                        value={dia.descanso_inicio}
                        onChange={(e) => updateDia(key, 'descanso_inicio', e.target.value)}
                        className="border rounded px-2 py-1 text-xs ml-2"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-xs">—</span>
                      <select
                        value={dia.descanso_fin}
                        onChange={(e) => updateDia(key, 'descanso_fin', e.target.value)}
                        className="border rounded px-2 py-1 text-xs"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Vista previa */}
      <div className="mt-6 bg-blue-50 rounded-xl p-5">
        <h3 className="font-medium text-sm mb-2">Vista previa para pacientes</h3>
        <div className="text-sm text-gray-700">
          {DIAS.filter(d => horario![d.key].activo).map(d => {
            const h = horario![d.key]
            return `${d.label.slice(0,3)}: ${h.inicio}-${h.fin}`
          }).join(' • ') || 'Sin horario configurado'}
        </div>
      </div>

      {/* Estado de guardado */}
      <div className="mt-4 flex items-center justify-end gap-3">
        {hasChanges &&!saving && (
          <span className="text-sm text-amber-600">Cambios sin guardar...</span>
        )}
        {saving && (
          <span className="text-sm text-gray-600">Guardando...</span>
        )}
        {!hasChanges &&!saving && (
          <span className="text-sm text-green-600">✓ Guardado</span>
        )}
        <button
          onClick={guardar}
          disabled={saving ||!hasChanges}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          Guardar ahora
        </button>
      </div>
    </div>
  )
}