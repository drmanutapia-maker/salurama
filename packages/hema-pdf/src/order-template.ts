import { PDFDocument, StandardFonts } from 'pdf-lib'
import { generateQrPngBytes } from './qr'
import { formatRoute } from '@salurama/hema-shared'
import type { OrderPdfDrug, OrderPdfInput, OrderPdfResult } from './types'
import {
  COLOR_ALERT,
  COLOR_BORDER,
  COLOR_BRAND,
  COLOR_INK,
  COLOR_MUTED,
  COLOR_WARN,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawWrapped,
  ensureSpace,
  makeCursor,
} from './pdf-helpers'

// ─── Helpers de formato ──────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function calcAge(birthDateIso: string): number {
  const today = new Date()
  const born = new Date(birthDateIso)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}

function formatInfusionTime(minutes: number | null): string {
  if (minutes == null) return '--'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

function isNoAllergyText(s: string | null): boolean {
  if (s == null) return true
  const t = s.trim()
  return t === '' || /^ninguna/i.test(t) || /^negad/i.test(t)
}

// ─── Builder principal ───────────────────────────────────────────────────────

export async function buildOrderPdf(input: OrderPdfInput): Promise<OrderPdfResult> {
  if (input.drugs.length === 0) {
    throw new Error('hema-pdf: la orden debe tener al menos un fármaco')
  }

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const contentWidth = PAGE_WIDTH - MARGIN * 2

  const newPage = () => pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const cursor = makeCursor(newPage(), newPage)

  // ── Encabezado institucional ──
  // independiente: nombre del médico/consultorio + cédula profesional en header
  // clinica: nombre de la clínica; el médico individual queda solo en el bloque de firma
  cursor.page.drawText(input.institution.name, { x: MARGIN, y: cursor.y, size: 14, font: fontBold, color: COLOR_BRAND })
  cursor.y -= 18

  const instSublines: string[] = []
  if (input.institution.tenantType === 'independiente' && input.prescriber.professionalLicense) {
    instSublines.push(`Cedula ${input.prescriber.professionalLicense}`)
  }
  if (input.institution.cofeprisLicense) {
    instSublines.push(`COFEPRIS ${input.institution.cofeprisLicense}`)
  }
  if (instSublines.length > 0) {
    cursor.page.drawText(instSublines.join('  ·  '), { x: MARGIN, y: cursor.y, size: 9, font, color: COLOR_MUTED })
    cursor.y -= 14
  }

  cursor.page.drawText('INDICACION DE QUIMIOTERAPIA', { x: MARGIN, y: cursor.y, size: 16, font: fontBold, color: COLOR_INK })
  const folioLabel = `Folio ${input.orderId.slice(0, 8).toUpperCase()}`
  cursor.page.drawText(folioLabel, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(folioLabel, 9),
    y: cursor.y + 4,
    size: 9,
    font,
    color: COLOR_MUTED,
  })
  cursor.y -= 22

  // ── Paciente ──
  drawSectionTitle(cursor, 'Paciente', fontBold)
  drawWrapped(cursor, `${input.patient.displayName}  ·  Exp. ${input.patient.expediente}`, {
    x: MARGIN, maxWidth: contentWidth, font: fontBold, size: 11, color: COLOR_INK,
  })
  drawWrapped(
    cursor,
    `${calcAge(input.patient.birthDate)} anos · ${input.patient.sex === 'F' ? 'Femenino' : 'Masculino'} · Nacimiento ${formatDate(input.patient.birthDate)}`,
    { x: MARGIN, maxWidth: contentWidth, font, size: 10, color: COLOR_MUTED },
  )
  if (input.patient.allergies && !isNoAllergyText(input.patient.allergies)) {
    drawWrapped(cursor, `ALERGIAS: ${input.patient.allergies}`, {
      x: MARGIN, maxWidth: contentWidth, font: fontBold, size: 10, color: COLOR_ALERT,
    })
  } else {
    drawWrapped(cursor, 'ALERGIAS: Ninguna conocida', {
      x: MARGIN, maxWidth: contentWidth, font, size: 10, color: COLOR_MUTED,
    })
  }
  cursor.y -= 8

  // ── Diagnóstico / Protocolo ──
  drawSectionTitle(cursor, 'Diagnostico y protocolo', fontBold)
  drawWrapped(cursor, `${input.diagnosisCode} -- ${input.diagnosisDesc ?? 'Sin descripcion'}`, {
    x: MARGIN, maxWidth: contentWidth, font, size: 10, color: COLOR_INK,
  })

  const nextCycleSuffix = input.protocol.nextCycleDate
    ? ` · Proximo ciclo: ${formatDate(input.protocol.nextCycleDate)}`
    : ''
  drawWrapped(
    cursor,
    `Protocolo ${input.protocol.code} -- ${input.protocol.name} · Ciclo ${input.cycleNumber}${nextCycleSuffix}`,
    { x: MARGIN, maxWidth: contentWidth, font, size: 10, color: COLOR_INK },
  )

  const bsaLine = [
    input.patient.weightKg != null && input.patient.heightCm != null
      ? `Peso ${input.patient.weightKg} kg · Talla ${input.patient.heightCm} cm · BSA ${input.bsaUsed.toFixed(2)} m2 (${input.bsaFormula === 'mosteller' ? 'Mosteller' : 'DuBois'})`
      : `BSA ${input.bsaUsed.toFixed(2)} m2 (${input.bsaFormula === 'mosteller' ? 'Mosteller' : 'DuBois'})`,
    input.ecog !== null ? `ECOG ${input.ecog}` : null,
    `Programada ${formatDate(input.scheduledFor)}`,
  ].filter(Boolean).join('  ·  ')
  drawWrapped(cursor, bsaLine, { x: MARGIN, maxWidth: contentWidth, font, size: 10, color: COLOR_MUTED })
  cursor.y -= 8

  // ── Tabla de fármacos ──
  drawSectionTitle(cursor, 'Farmacos indicados', fontBold)
  drawDrugTable(cursor, input.drugs, font, fontBold, contentWidth)
  cursor.y -= 8

  // ── Disclaimer NOM-004 ──
  ensureSpace(cursor, 40)
  cursor.page.drawRectangle({
    x: MARGIN, y: cursor.y - 36, width: contentWidth, height: 36,
    borderColor: COLOR_BORDER, borderWidth: 1,
  })
  cursor.y -= 8
  drawWrapped(cursor, input.disclaimer, { x: MARGIN + 8, maxWidth: contentWidth - 16, font, size: 8.5, color: COLOR_MUTED, lineGap: 2 })
  cursor.y -= 12

  // ── Firmas ──
  drawSectionTitle(cursor, 'Firma electronica', fontBold)
  if (input.signatures.length === 0) {
    drawWrapped(cursor, 'Pendiente de firma.', { x: MARGIN, maxWidth: contentWidth, font, size: 10, color: COLOR_MUTED })
  } else {
    for (const sig of input.signatures) {
      const provLabel = sig.pscProvider === 'dev' ? 'FIRMA DE PRUEBA -- NO VALIDA ANTE NOM-151' : sig.pscProvider.toUpperCase()
      drawWrapped(cursor, `${sig.signerName ?? 'Medico'} · ${formatDateTime(sig.signedAt)}`, {
        x: MARGIN, maxWidth: contentWidth, font: fontBold, size: 10, color: COLOR_INK,
      })
      drawWrapped(cursor, provLabel, {
        x: MARGIN, maxWidth: contentWidth, font, size: 9, color: sig.pscProvider === 'dev' ? COLOR_ALERT : COLOR_MUTED,
      })
    }
  }

  if (input.prescriber.fullName) {
    cursor.y -= 4
    drawWrapped(
      cursor,
      `Medico tratante: ${input.prescriber.fullName}${input.prescriber.professionalLicense ? ` · Cedula ${input.prescriber.professionalLicense}` : ''}`,
      { x: MARGIN, maxWidth: contentWidth, font, size: 9, color: COLOR_MUTED },
    )
  }

  // ── Pie: QR de verificación ──
  const qrBytes = await generateQrPngBytes(input.verificationUrl)
  const qrImage = await pdfDoc.embedPng(qrBytes)
  const qrSize = 64
  for (const page of pdfDoc.getPages()) {
    page.drawImage(qrImage, { x: PAGE_WIDTH - MARGIN - qrSize, y: MARGIN - 10, width: qrSize, height: qrSize })
    page.drawText('Verificar autenticidad', {
      x: PAGE_WIDTH - MARGIN - qrSize, y: MARGIN - 22, size: 7, font, color: COLOR_MUTED,
    })
    page.drawText(`Generado ${formatDateTime(input.generatedAt)}`, { x: MARGIN, y: MARGIN - 10, size: 7, font, color: COLOR_MUTED })
  }

  const bytes = await pdfDoc.save()
  return { bytes }
}

// ─── Secciones internas ──────────────────────────────────────────────────────

function drawSectionTitle(cursor: ReturnType<typeof makeCursor>, title: string, fontBold: Awaited<ReturnType<PDFDocument['embedFont']>>): void {
  ensureSpace(cursor, 20)
  cursor.page.drawText(title.toUpperCase(), { x: MARGIN, y: cursor.y, size: 9, font: fontBold, color: COLOR_BRAND })
  cursor.y -= 14
}

function drawDrugTable(
  cursor: ReturnType<typeof makeCursor>,
  drugs: OrderPdfDrug[],
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  fontBold: Awaited<ReturnType<PDFDocument['embedFont']>>,
  contentWidth: number,
): void {
  const cols = { inn: MARGIN, route: MARGIN + 150, day: MARGIN + 210, dose: MARGIN + 250, infusion: MARGIN + 340 }

  ensureSpace(cursor, 16)
  cursor.page.drawText('Farmaco', { x: cols.inn, y: cursor.y, size: 8, font: fontBold, color: COLOR_MUTED })
  cursor.page.drawText('Via', { x: cols.route, y: cursor.y, size: 8, font: fontBold, color: COLOR_MUTED })
  cursor.page.drawText('Dia', { x: cols.day, y: cursor.y, size: 8, font: fontBold, color: COLOR_MUTED })
  cursor.page.drawText('Dosis', { x: cols.dose, y: cursor.y, size: 8, font: fontBold, color: COLOR_MUTED })
  cursor.page.drawText('Infusion', { x: cols.infusion, y: cursor.y, size: 8, font: fontBold, color: COLOR_MUTED })
  cursor.y -= 12
  cursor.page.drawLine({ start: { x: MARGIN, y: cursor.y }, end: { x: MARGIN + contentWidth, y: cursor.y }, thickness: 0.5, color: COLOR_BORDER })
  cursor.y -= 10

  for (const drug of drugs) {
    ensureSpace(cursor, 14)
    const wasReduced = drug.computedDoseMg !== drug.baseDoseMg
    cursor.page.drawText(drug.inn, { x: cols.inn, y: cursor.y, size: 9, font: fontBold, color: COLOR_INK })
    cursor.page.drawText(formatRoute(drug.route), { x: cols.route, y: cursor.y, size: 9, font, color: COLOR_INK })
    cursor.page.drawText(String(drug.givenOnDay), { x: cols.day, y: cursor.y, size: 9, font, color: COLOR_INK })
    cursor.page.drawText(`${drug.computedDoseMg} mg`, { x: cols.dose, y: cursor.y, size: 9, font, color: wasReduced ? COLOR_WARN : COLOR_INK })
    cursor.page.drawText(formatInfusionTime(drug.infusionMinutes), { x: cols.infusion, y: cursor.y, size: 9, font, color: COLOR_MUTED })
    cursor.y -= 13

    if (wasReduced && drug.reductionReason) {
      drawWrapped(cursor, `Reduccion ${drug.reductionPct}%: ${drug.reductionReason}`, {
        x: cols.inn + 8, maxWidth: contentWidth - 8, font, size: 8, color: COLOR_WARN, lineGap: 2,
      })
    }
    if (drug.overrideReason) {
      drawWrapped(cursor, `Justificacion de alerta: ${drug.overrideReason}`, {
        x: cols.inn + 8, maxWidth: contentWidth - 8, font, size: 8, color: COLOR_ALERT, lineGap: 2,
      })
    }
    cursor.y -= 4
  }
}
