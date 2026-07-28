import ExcelJS from 'exceljs'
import type { ResenasData } from './resenasData'

// Mismo patrón que lib/estadisticasExcel.ts — exceljs no soporta gráficos
// nativos, se prioriza una tabla con formato profesional.

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

export async function buildResenasExcel(data: ResenasData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Salurama'
  workbook.created = new Date()

  // ── Resumen ──────────────────────────────────────────────────────────────
  const resumen = workbook.addWorksheet('Resumen')
  addTitle(resumen, `Reseñas de ${data.doctorNombre}`, 3)
  resumen.addRow([])
  const kpiHeader = resumen.addRow(['Indicador', 'Valor'])
  styleHeaderRow(kpiHeader)
  resumen.addRow(['Total de reseñas', data.total])
  resumen.addRow(['Rating promedio', data.total > 0 ? Number(data.ratingPromedio.toFixed(1)) : '—'])
  resumen.columns = [{ width: 22 }, { width: 14 }, { width: 14 }]

  resumen.addRow([])
  const distStartRow = resumen.rowCount + 1
  resumen.getCell(distStartRow, 1).value = 'Distribución por calificación'
  resumen.getCell(distStartRow, 1).font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } }
  styleHeaderRow(resumen.addRow(['Estrellas', 'Cantidad', '% del total']))
  for (const r of data.ratingDist) {
    resumen.addRow([r.stars, r.count, `${r.pct.toFixed(0)}%`])
  }

  // ── Todas las reseñas ────────────────────────────────────────────────────
  const listado = workbook.addWorksheet('Todas las reseñas')
  addTitle(listado, `Todas las reseñas (${data.total})`, 3)
  listado.addRow([])
  styleHeaderRow(listado.addRow(['Calificación', 'Comentario', 'Fecha']))
  for (const r of data.reviews) {
    listado.addRow([r.rating, r.comment || '(sin comentario)', new Date(r.created_at).toLocaleDateString('es-MX')])
  }
  listado.columns = [{ width: 14 }, { width: 60 }, { width: 16 }]
  listado.getColumn(2).alignment = { wrapText: true, vertical: 'top' }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
