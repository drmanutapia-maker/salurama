'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import MSLChat from '@/components/msl/MSLChat'

interface MslContext {
  diagnosis_code: string
  description_es: string
  staging:        string | null
  cytogenetics:   Record<string, boolean> | null
}

function formatCytogenetics(cyto: Record<string, boolean> | null): string | null {
  if (!cyto) return null
  const positive = Object.entries(cyto)
    .filter(([, value]) => value === true)
    .map(([key]) => key.replace(/_/g, ' '))
  return positive.length > 0 ? positive.join(', ') : null
}

function buildContextLabel(ctx: MslContext): string {
  const parts = [`${ctx.description_es} (${ctx.diagnosis_code})`]
  if (ctx.staging) parts.push(`estadio ${ctx.staging}`)
  const cytoLabel = formatCytogenetics(ctx.cytogenetics)
  if (cytoLabel) parts.push(`riesgo citogenético: ${cytoLabel}`)
  return parts.join(', ')
}

export default function Page() {
  const searchParams = useSearchParams()
  const pacienteId = searchParams.get('pacienteId')
  const [patientContext, setPatientContext] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!pacienteId) return

    let mounted = true

    supabase.rpc('hema_get_msl_context', { p_patient_id: pacienteId }).then(({ data }) => {
      if (!mounted) return
      const ctx = (data as MslContext[] | null)?.[0]
      if (ctx) setPatientContext(buildContextLabel(ctx))
    })

    return () => { mounted = false }
  }, [pacienteId])

  return (
    // Presupuesto de altura de app/hema/layout.tsx: 72=Navbar fijo raíz,
    // 49=HemaNav sticky, 56=footer NOM-004. El <main> de HemaLayout aplica
    // padding: 20px 16px 80px alrededor de {children} (pensado para páginas
    // normales de HEMA con scroll de página); ese padding no le sirve al chat
    // (MSLChat ya reserva su propio espacio inferior vía pb-20) y solo le
    // robaría 100px de altura real. En vez de restarlo en la fórmula, lo
    // cancelamos con márgenes negativos (-mt-5 -mx-4 -mb-20 = -20px/-16px/-80px,
    // los mismos valores del padding del padre) para que este div ocupe el
    // <main> completo y la fórmula de altura solo reste lo que de verdad
    // consume espacio: Navbar + HemaNav + footer NOM-004.
    // El BottomNav (mobile, position:fixed) no se resta aquí — MSLChat ya
    // reserva su propio espacio para él vía pb-20 en el área de input.
    // md: además resta la "Cabecera contextual del médico" (~40px), que solo
    // se renderiza en desktop (display:none por debajo de 768px), más un
    // margen de seguridad de 16px válido solo en desktop.
    // 100svh (no 100vh) — en móvil, 100vh mide el viewport más grande posible
    // (barra de direcciones oculta), no el espacio realmente visible; mismo
    // patrón que ya usa /dashboard/msl-virtual.
    <div className="-mt-5 -mx-4 -mb-20 h-[calc(100svh-72px-49px-56px)] md:h-[calc(100svh-72px-49px-56px-16px-40px)]">
      <MSLChat
        backHref={pacienteId ? `/hema/pacientes/${pacienteId}` : '/hema'}
        backLabel={pacienteId ? 'Paciente' : 'Inicio'}
        patientContext={patientContext}
      />
    </div>
  )
}
