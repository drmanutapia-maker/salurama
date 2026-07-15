import ExcelJS from 'exceljs'
import type { EstadisticasData } from './estadisticasData'

// exceljs no soporta gráficos nativos de Excel (solo celdas, formato e imágenes
// estáticas) — se prioriza una tabla con formato profesional en su lugar.

const BRAND_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = HEADER_FONT
    cell.fill = BRAND_FILL
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
  })
  row.height = 20
}

function addTitle(sheet: ExcelJS.Worksheet, title: string, span: number) {
  sheet.mergeCells(1, 1, 1, span)
  const cell = sheet.getCell(1, 1)
  cell.value = title
  cell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } }
  sheet.getRow(1).height = 26
}

export async function buildEstadisticasExcel(data: EstadisticasData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Salurama'
  workbook.created = new Date()

  // ── Resumen ──────────────────────────────────────────────────────────────
  const resumen = workbook.addWorksheet('Resumen')
  addTitle(resumen, `Estadísticas de ${data.doctorNombre}`, 2)
  resumen.addRow([])
  const kpiHeader = resumen.addRow(['Indicador', 'Valor'])
  styleHeaderRow(kpiHeader)
  resumen.addRow(['Vistas al perfil', data.profileViews])
  resumen.addRow(['Total de citas', data.total])
  resumen.addRow(['Tasa de confirmación', `${data.tasaConfirmacion}%`])
  resumen.addRow(['Rating promedio', data.reviews.length > 0 ? Number(data.ratingPromedio.toFixed(1)) : '—'])
  resumen.addRow(['Perfil completado', `${data.completionPct}%`])
  resumen.columns = [{ width: 28 }, { width: 20 }]

  // ── Distribución de citas ───────────────────────────────────────────────
  const citasSheet = workbook.addWorksheet('Distribución de citas')
  addTitle(citasSheet, 'Distribución de citas por estado', 2)
  citasSheet.addRow([])
  styleHeaderRow(citasSheet.addRow(['Estado', 'Cantidad']))
  citasSheet.addRow(['Pendientes', data.porStatus.pending_verification])
  citasSheet.addRow(['Confirmadas', data.porStatus.confirmed])
  citasSheet.addRow(['Completadas', data.porStatus.completed])
  citasSheet.addRow(['Canceladas', data.porStatus.cancelled])
  citasSheet.columns = [{ width: 20 }, { width: 14 }]

  citasSheet.addRow([])
  const mesesStartRow = citasSheet.rowCount + 1
  citasSheet.getCell(mesesStartRow, 1).value = 'Citas — últimos 6 meses'
  citasSheet.getCell(mesesStartRow, 1).font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } }
  styleHeaderRow(citasSheet.addRow(['Mes', 'Citas']))
  for (const m of data.citasPorMes) citasSheet.addRow([m.label, m.count])

  citasSheet.addRow([])
  const diaStartRow = citasSheet.rowCount + 1
  citasSheet.getCell(diaStartRow, 1).value = 'Citas por día de semana'
  citasSheet.getCell(diaStartRow, 1).font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } }
  styleHeaderRow(citasSheet.addRow(['Día', 'Citas']))
  for (const d of data.citasPorDia) citasSheet.addRow([d.label, d.count])

  // ── Reseñas ──────────────────────────────────────────────────────────────
  const reviewsSheet = workbook.addWorksheet('Reseñas')
  addTitle(reviewsSheet, 'Reseñas de pacientes', 3)
  reviewsSheet.addRow([])
  styleHeaderRow(reviewsSheet.addRow(['Estrellas', 'Cantidad', '% del total']))
  for (const r of data.ratingDist) {
    reviewsSheet.addRow([r.stars, r.count, `${r.pct.toFixed(0)}%`])
  }
  reviewsSheet.addRow([])
  const ultimasStartRow = reviewsSheet.rowCount + 1
  reviewsSheet.getCell(ultimasStartRow, 1).value = 'Últimas reseñas'
  reviewsSheet.getCell(ultimasStartRow, 1).font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } }
  styleHeaderRow(reviewsSheet.addRow(['Rating', 'Comentario', 'Fecha']))
  for (const r of data.reviews.slice(0, 3)) {
    reviewsSheet.addRow([r.rating, r.comment || '(sin comentario)', new Date(r.created_at).toLocaleDateString('es-MX')])
  }
  reviewsSheet.columns = [{ width: 12 }, { width: 60 }, { width: 16 }]
  reviewsSheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' }

  // ── Perfil completado ────────────────────────────────────────────────────
  const perfilSheet = workbook.addWorksheet('Perfil completado')
  addTitle(perfilSheet, `Perfil completado — ${data.completionPct}%`, 2)
  perfilSheet.addRow([])
  styleHeaderRow(perfilSheet.addRow(['Rubro', 'Completado']))
  for (const c of data.checks) {
    const row = perfilSheet.addRow([c.label, c.ok ? 'Sí' : 'No'])
    row.getCell(2).font = { color: { argb: c.ok ? 'FF2A9D8F' : 'FF9CA3AF' }, bold: c.ok }
  }
  perfilSheet.columns = [{ width: 30 }, { width: 14 }]

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
