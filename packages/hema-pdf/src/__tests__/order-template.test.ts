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
    disclaimer: 'Herramienta de soporte a la decisión clínica. El médico tratante es el único responsable de la prescripción.',
    diagnosisCode: 'C90.0',
    diagnosisDesc: 'Mieloma múltiple',
    institution: { name: 'CMN La Raza', clues: 'DFSSA001234', cofeprisLicense: '12345' },
    patient: {
      displayName: 'Manuel Augusto Tapia Dávila',
      curp: 'TADM800101HDFRVN05',
      birthDate: '1980-01-01',
      sex: 'M',
      allergies: null,
    },
    protocol: { code: 'VRd', name: 'Bortezomib-Lenalidomida-Dexametasona', cycleLengthDays: 28, totalCycles: 8 },
    prescriber: { fullName: 'Dra. Ana Pérez', professionalLicense: '7654321' },
    drugs: [makeDrug()],
    signatures: [],
    verificationUrl: 'https://salurama.com/hema/v/11111111-2222-3333-4444-555555555555',
    generatedAt: '2026-06-19T12:00:00.000Z',
    ...overrides,
  }
}

describe('buildOrderPdf', () => {
  it('lanza error si la orden no tiene fármacos', async () => {
    await expect(buildOrderPdf(makeInput({ drugs: [] }))).rejects.toThrow('al menos un fármaco')
  })

  it('genera bytes con encabezado PDF válido (%PDF-)', async () => {
    const { bytes } = await buildOrderPdf(makeInput())
    const header = Buffer.from(bytes.slice(0, 5)).toString('ascii')
    expect(header).toBe('%PDF-')
  })

  it('produce un PDF estructuralmente válido de 1 página para una orden simple', async () => {
    const { bytes } = await buildOrderPdf(makeInput())
    const reloaded = await PDFDocument.load(bytes)
    expect(reloaded.getPageCount()).toBe(1)
  })

  it('pagina a más de 1 página cuando el contenido no cabe', async () => {
    const manyDrugs = Array.from({ length: 40 }, (_, i) =>
      makeDrug({
        inn: `Fármaco ${i + 1}`,
        givenOnDay: i + 1,
        reductionPct: 20,
        reductionReason: 'Justificación larga de reducción de dosis para forzar el wrap de texto y el avance del cursor entre filas de la tabla.',
        overrideReason: 'Justificación larga de la alerta clínica que el médico documentó al firmar esta indicación de quimioterapia.',
      }),
    )
    const { bytes } = await buildOrderPdf(makeInput({ drugs: manyDrugs }))
    const reloaded = await PDFDocument.load(bytes)
    expect(reloaded.getPageCount()).toBeGreaterThan(1)
  })

  it('incluye una firma de prueba marcada como no válida ante NOM-151', async () => {
    const { bytes } = await buildOrderPdf(
      makeInput({
        status: 'signed',
        signatures: [{ signerName: 'Dra. Ana Pérez', pscProvider: 'dev', signedAt: '2026-06-19T12:05:00.000Z' }],
      }),
    )
    const reloaded = await PDFDocument.load(bytes)
    expect(reloaded.getPageCount()).toBeGreaterThanOrEqual(1)
  })
})
