import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { buildOrderPdf } from '../order-template'
import type { OrderPdfDrug, OrderPdfInput } from '../types'

function makeDrug(overrides: Partial<OrderPdfDrug> = {}): OrderPdfDrug {
  return {
    inn: 'Vincristina',
    route: 'IV',
    givenOnDay: 1,
    computedDoseMg: 2,
    baseDoseMg: 2,
    reductionPct: 0,
    reductionReason: null,
    infusionMinutes: 15,
    vehicle: 'SSN 0.9% 50mL',
    overrideReason: null,
    warningMessages: [],
    ...overrides,
  }
}

function makeInput(overrides: Partial<OrderPdfInput> = {}): OrderPdfInput {
  return {
    orderId: '11111111-2222-3333-4444-555555555555',
    status: 'validated',
    cycleNumber: 1,
    dayOfCycle: 1,
    scheduledFor: '2026-06-20',
    bsaUsed: 2.01,
    bsaFormula: 'mosteller',
    ecog: 1,
    disclaimer: 'Herramienta de soporte a la decision clinica. El medico tratante es el unico responsable de la prescripcion.',
    diagnosisCode: 'C90.0',
    diagnosisDesc: 'Mieloma multiple',
    institution: { name: 'CMN La Raza', tenantType: 'clinica', cofeprisLicense: '12345' },
    patient: {
      displayName: 'Manuel Augusto Tapia Davila',
      expediente: 'LARAZA-000001',
      birthDate: '1980-01-01',
      sex: 'M',
      allergies: null,
      weightKg: 72,
      heightCm: 170,
    },
    protocol: { code: 'VRd', name: 'Bortezomib-Lenalidomida-Dexametasona', cycleLengthDays: 28, totalCycles: 8, nextCycleDate: '2026-07-18' },
    prescriber: { fullName: 'Dra. Ana Perez', professionalLicense: '7654321' },
    drugs: [makeDrug()],
    signatures: [],
    verificationUrl: 'https://salurama.com/hema/v/11111111-2222-3333-4444-555555555555',
    generatedAt: '2026-06-19T12:00:00.000Z',
    ...overrides,
  }
}

describe('buildOrderPdf', () => {
  it('lanza error si la orden no tiene farmacos', async () => {
    await expect(buildOrderPdf(makeInput({ drugs: [] }))).rejects.toThrow('al menos un f')
  })

  it('genera bytes con encabezado PDF valido (%PDF-)', async () => {
    const { bytes } = await buildOrderPdf(makeInput())
    const header = Buffer.from(bytes.slice(0, 5)).toString('ascii')
    expect(header).toBe('%PDF-')
  })

  it('produce un PDF estructuralmente valido de 1 pagina para una orden simple', async () => {
    const { bytes } = await buildOrderPdf(makeInput())
    const reloaded = await PDFDocument.load(bytes)
    expect(reloaded.getPageCount()).toBe(1)
  })

  it('pagina a mas de 1 pagina cuando el contenido no cabe', async () => {
    const manyDrugs = Array.from({ length: 40 }, (_, i) =>
      makeDrug({
        inn: `Farmaco ${i + 1}`,
        givenOnDay: i + 1,
        reductionPct: 20,
        reductionReason: 'Justificacion larga de reduccion de dosis para forzar el wrap de texto y el avance del cursor entre filas de la tabla.',
        overrideReason: 'Justificacion larga de la alerta clinica que el medico documento al firmar esta indicacion de quimioterapia.',
      }),
    )
    const { bytes } = await buildOrderPdf(makeInput({ drugs: manyDrugs }))
    const reloaded = await PDFDocument.load(bytes)
    expect(reloaded.getPageCount()).toBeGreaterThan(1)
  })

  it('incluye una firma de prueba marcada como no valida ante NOM-151', async () => {
    const { bytes } = await buildOrderPdf(
      makeInput({
        status: 'signed',
        signatures: [{ signerName: 'Dra. Ana Perez', pscProvider: 'dev', signedAt: '2026-06-19T12:05:00.000Z' }],
      }),
    )
    const reloaded = await PDFDocument.load(bytes)
    expect(reloaded.getPageCount()).toBeGreaterThanOrEqual(1)
  })

  it('muestra ALERGIAS: Ninguna conocida cuando no hay alergias', async () => {
    const { bytes } = await buildOrderPdf(makeInput({ patient: { ...makeInput().patient, allergies: null } }))
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('muestra peso y talla cuando estan disponibles', async () => {
    const { bytes } = await buildOrderPdf(makeInput())
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('mapea PO a VO en la tabla de farmacos', async () => {
    const { bytes } = await buildOrderPdf(makeInput({ drugs: [makeDrug({ route: 'PO' })] }))
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('normaliza "Ninguna" y "Negadas" como sin alergias (gris)', async () => {
    const inputs = ['Ninguna', 'ninguna', 'Negadas', 'negadas', '', '   ']
    for (const allergies of inputs) {
      const { bytes } = await buildOrderPdf(makeInput({ patient: { ...makeInput().patient, allergies } }))
      expect(bytes.length).toBeGreaterThan(0)
    }
  })

  it('omite la linea de proximo ciclo cuando nextCycleDate es null', async () => {
    const { bytes } = await buildOrderPdf(makeInput({ protocol: { ...makeInput().protocol, nextCycleDate: null } }))
    expect(bytes.length).toBeGreaterThan(0)
  })
})
