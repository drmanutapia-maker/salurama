'use client'

import { useState } from 'react'
import { ChevronDown, CheckCircle2, XCircle } from 'lucide-react'
import BackButton from '@/components/BackButton'
import { reviewRegimen, type ReviewDecision } from './actions'

export type Drug = { name: string; dose: string | null; route: string | null }

export type Regimen = {
  id: string
  regimen_name: string
  pathology: string
  cie10_codes: string[]
  treatment_line: string | null
  drugs: Drug[]
  cycles: string | null
  source_pmcid: string | null
  source_license: string
  source_excerpt: string
  review_status: string
  created_at: string
}

type Group = { pathology: string; items: Regimen[] }

type Toast = { msg: string; type: 'success' | 'error' } | null

const TREATMENT_LINE_LABEL: Record<string, string> = {
  primera_linea: 'Primera línea',
  segunda_linea: 'Segunda línea',
  recaida_refractario: 'Recaída/refractario',
  mantenimiento: 'Mantenimiento',
}

function formatPathology(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatTreatmentLine(line: string | null): string {
  if (!line) return 'Línea no especificada'
  return TREATMENT_LINE_LABEL[line] ?? line
}

export default function RegimenReviewClient({ groups: initialGroups }: { groups: Group[] }) {
  const [groups, setGroups] = useState(initialGroups)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [procesando, setProcesando] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast>(null)

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  function toggleGroup(pathology: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(pathology)) next.delete(pathology)
      else next.add(pathology)
      return next
    })
  }

  async function handleDecision(regimen: Regimen, decision: ReviewDecision) {
    const label = decision === 'aprobado'
      ? `aprobar "${regimen.regimen_name}"`
      : `rechazar "${regimen.regimen_name}"`
    if (!confirm(`¿Confirmas ${label}? No hay forma de deshacerlo desde aquí.`)) return

    const key = regimen.id + '_' + decision
    setProcesando(key)
    try {
      const result = await reviewRegimen(regimen.id, decision)
      if (!result.success) {
        showToast(`Error: ${result.error}`, 'error')
        return
      }
      setGroups(prev =>
        prev
          .map(g => g.pathology === regimen.pathology
            ? { ...g, items: g.items.filter(r => r.id !== regimen.id) }
            : g)
          .filter(g => g.items.length > 0)
      )
      showToast(decision === 'aprobado' ? 'Esquema aprobado.' : 'Esquema rechazado.', 'success')
    } catch {
      showToast('Error de red al actualizar.', 'error')
    } finally {
      setProcesando(null)
    }
  }

  const totalPending = groups.reduce((sum, g) => sum + g.items.length, 0)

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
        <div className="mb-4">
          <BackButton fallback="/dashboard/msl-virtual" />
        </div>

        <h1 className="font-headline text-2xl text-primary-900 mb-1">Revisión de esquemas — Componente 2</h1>
        <p className="font-body text-sm text-neutral-600 mb-6">
          {totalPending} esquema{totalPending === 1 ? '' : 's'} pendiente{totalPending === 1 ? '' : 's'} de revisión clínica.
          Ninguno se usa en el chat de MSL Virtual hasta que lo apruebes aquí.
        </p>

        {totalPending === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center font-body text-neutral-500">
            No hay esquemas pendientes de revisión.
          </div>
        )}

        <div className="space-y-4">
          {groups.map(group => {
            const isCollapsed = collapsed.has(group.pathology)
            return (
              <div key={group.pathology} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.pathology)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 sm:px-5 min-h-11 font-body font-semibold text-neutral-800 hover:bg-neutral-50 text-left"
                >
                  <span>
                    {formatPathology(group.pathology)}{' '}
                    <span className="text-neutral-400 font-normal">({group.items.length})</span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-neutral-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="border-t border-neutral-200 divide-y divide-neutral-200">
                    {group.items.map(regimen => {
                      const approveKey = regimen.id + '_aprobado'
                      const rejectKey = regimen.id + '_rechazado'
                      const busy = procesando === approveKey || procesando === rejectKey

                      return (
                        <div key={regimen.id} className="px-4 py-4 sm:px-5">
                          <h2 className="font-body font-semibold text-neutral-900">{regimen.regimen_name}</h2>

                          <div className="mt-1.5 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                              {formatTreatmentLine(regimen.treatment_line)}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                              {regimen.source_pmcid ?? 'openFDA'} · {regimen.source_license}
                            </span>
                          </div>

                          {regimen.drugs.length > 0 && (
                            <ul className="mt-3 space-y-1 font-body text-sm text-neutral-700">
                              {regimen.drugs.map((d, i) => (
                                <li key={i}>
                                  <span className="font-medium">{d.name}</span>
                                  {d.dose ? ` — ${d.dose}` : ''}
                                  {d.route ? ` (${d.route})` : ''}
                                </li>
                              ))}
                            </ul>
                          )}

                          {regimen.cycles && (
                            <p className="mt-3 font-body text-sm text-neutral-700">{regimen.cycles}</p>
                          )}

                          <blockquote className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-body text-sm text-neutral-600 italic whitespace-pre-wrap">
                            {regimen.source_excerpt}
                          </blockquote>

                          <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => handleDecision(regimen, 'aprobado')}
                              disabled={busy}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 rounded-xl bg-secondary-500 px-4 font-body text-sm font-semibold text-white disabled:opacity-50"
                            >
                              <CheckCircle2 size={16} />
                              {procesando === approveKey ? 'Aprobando…' : 'Aprobar'}
                            </button>
                            <button
                              onClick={() => handleDecision(regimen, 'rechazado')}
                              disabled={busy}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 rounded-xl border border-error-100 bg-error-50 px-4 font-body text-sm font-semibold text-error-700 disabled:opacity-50"
                            >
                              <XCircle size={16} />
                              {procesando === rejectKey ? 'Rechazando…' : 'Rechazar'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 font-body text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-secondary-500 text-white' : 'bg-error-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
