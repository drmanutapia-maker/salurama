'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Cita } from '@/lib/citas/types'
import { fechaISOLocal } from '@/lib/citas/fechas'

const citaWord = (n: number) => n === 1 ? 'cita' : 'citas'

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

interface CalendarioMensualProps {
  citas: Cita[]
  selectedDate: string | null
  onSelectDate: (fecha: string | null) => void
}

export default function CalendarioMensual({ citas, selectedDate, onSelectDate }: CalendarioMensualProps) {
  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  })

  // Conteo por día — solo citas "reales" (no canceladas), es la señal que le
  // importa al médico al ver el mes de un vistazo.
  const conteoPorDia = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const cita of citas) {
      if (cita.estado === 'cancelled' || cita.estado === 'cancelada_paciente') continue
      mapa.set(cita.fecha, (mapa.get(cita.fecha) || 0) + 1)
    }
    return mapa
  }, [citas])

  const hoyISO = fechaISOLocal(new Date())

  const celdas = useMemo(() => {
    const year = mesActual.getFullYear()
    const month = mesActual.getMonth()
    const primerDiaSemana = new Date(year, month, 1).getDay()
    const diasEnMes = new Date(year, month + 1, 0).getDate()

    const out: { fecha: string; dia: number }[] = []
    for (let i = 0; i < primerDiaSemana; i++) out.push({ fecha: '', dia: 0 })
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      out.push({ fecha, dia })
    }
    return out
  }, [mesActual])

  function cambiarMes(delta: number) {
    setMesActual(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  function irAHoy() {
    const hoy = new Date()
    setMesActual(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
    onSelectDate(hoyISO)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => cambiarMes(-1)} aria-label="Mes anterior" style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={16} color="#6B7280" aria-hidden="true" />
          </button>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 900, color: '#111827', minWidth: 150, textAlign: 'center', textTransform: 'capitalize' }}>
            {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
          </p>
          <button onClick={() => cambiarMes(1)} aria-label="Mes siguiente" style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <ChevronRight size={16} color="#6B7280" aria-hidden="true" />
          </button>
        </div>
        <button onClick={irAHoy} style={{ background: '#EEF2FF', color: '#1E3A5F', border: 'none', borderRadius: 50, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Hoy
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', padding: '2px 0' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {celdas.map((c, i) => {
          if (!c.fecha) return <div key={i} />
          const count = conteoPorDia.get(c.fecha) || 0
          const esHoy = c.fecha === hoyISO
          const esSeleccionado = c.fecha === selectedDate

          return (
            <button
              key={c.fecha}
              onClick={() => onSelectDate(esSeleccionado ? null : c.fecha)}
              aria-label={`Día ${c.dia}${count > 0 ? `, ${count} ${citaWord(count)}` : ''}`}
              style={{
                minHeight: 50,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                borderRadius: 10, cursor: 'pointer', position: 'relative', padding: '3px 2px',
                border: esHoy && !esSeleccionado ? '1.5px solid #1E3A5F' : '1.5px solid transparent',
                background: esSeleccionado ? '#1E3A5F' : count > 0 ? '#F0F4F8' : 'transparent',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: esHoy || esSeleccionado ? 700 : 500, color: esSeleccionado ? '#fff' : '#111827' }}>
                {c.dia}
              </span>
              {count > 0 && (
                <span style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: esSeleccionado ? '#fff' : '#2A9D8F',
                  background: esSeleccionado ? 'rgba(255,255,255,0.25)' : '#E8F7F5',
                  borderRadius: 8, padding: '3px 4px', width: '100%',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{count}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.2 }}>{citaWord(count)}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
