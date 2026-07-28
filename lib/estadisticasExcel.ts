import ExcelJS from 'exceljs'
import type { EstadisticasData, TrendMetric, BenchmarkGrupo } from './estadisticasData'

// Beneficio Premium — quien genera este Excel ya tiene el plan, no hace
// falta gate adicional aquí (igual que en estadisticasPdf.ts).
function formatCambio(t: TrendMetric): { texto: string; argb: string } {
  if (t.direccion === 'nuevo') return { texto: 'Nuevo este mes', argb: 'FF2A9D8F' }
  if (t.direccion === 'flat') return { texto: 'Sin cambio', argb: 'FF6B7280' }
  const pct = t.cambioPct !== null ? `${t.direccion === 'up' ? '+' : ''}${Math.round(t.cambioPct)}%` : ''
  return { texto: `${t.direccion === 'up' ? 'Subió' : 'Bajó'} ${pct}`, argb: t.direccion === 'up' ? 'FF2A9D8F' : 'FFEF4444' }
}

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
  resumen.columns = [{ width: 28 }, { width: 16 }, { width: 16 }, { width: 26 }]

  resumen.addRow([])
  const tendenciaStartRow = resumen.rowCount + 1
  resumen.getCell(tendenciaStartRow, 1).value = 'Tendencia mensual'
  resumen.getCell(tendenciaStartRow, 1).font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } }
  styleHeaderRow(resumen.addRow(['Métrica', 'Este mes', 'Mes anterior', 'Cambio']))
  const filasTendencia: { label: string; trend: TrendMetric; valor: number }[] = [
    { label: 'Vistas al perfil', trend: data.tendencias.vistas, valor: data.tendencias.vistas.actual },
    { label: 'Calificación', trend: data.tendencias.calificacion, valor: Number(data.tendencias.calificacion.actual.toFixed(1)) },
    { label: 'Reseñas nuevas', trend: data.tendencias.reseñas, valor: data.tendencias.reseñas.actual },
  ]
  for (const fila of filasTendencia) {
    const { texto, argb } = formatCambio(fila.trend)
    const row = resumen.addRow([fila.label, fila.valor, fila.trend.anterior, texto])
    row.getCell(4).font = { color: { argb }, bold: true }
  }

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
  reviewsSheet.columns = [{ width: 14 }, { width: 12 }, { width: 14 }]

  // ── Cómo te comparas (benchmark de especialidad, beneficio Premium —
  // mismo criterio que el resto: quien genera este Excel ya lo tiene) ────
  if (data.benchmark) {
    const benchmarkSheet = workbook.addWorksheet('Cómo te comparas')
    addTitle(benchmarkSheet, `Benchmark de ${data.benchmark.especialidad}`, 4)
    benchmarkSheet.addRow([])
    styleHeaderRow(benchmarkSheet.addRow(['Comparación', 'Métrica', 'Tú', 'Grupo']))

    const tuRatingTexto = data.reviews.length > 0 ? Number(data.ratingPromedio.toFixed(1)) : '—'
    const grupos: { titulo: string; grupo: BenchmarkGrupo | null }[] = [
      { titulo: 'Toda la plataforma', grupo: data.benchmark.nacional },
      { titulo: data.benchmark.ciudad || 'Sin ciudad registrada', grupo: data.benchmark.ciudadGrupo },
    ]
    for (const { titulo, grupo } of grupos) {
      const filas: { label: string; tu: string | number; grupoValor: number | null; suficiente: boolean; formato: (v: number) => string | number }[] = [
        { label: 'Rating promedio', tu: tuRatingTexto, grupoValor: grupo?.ratingPromedio ?? null, suficiente: grupo?.ratingSuficiente ?? false, formato: (v) => Number(v.toFixed(1)) },
        { label: 'Tasa de confirmación', tu: `${data.tasaConfirmacion}%`, grupoValor: grupo?.tasaConfirmacion ?? null, suficiente: grupo?.tasaSuficiente ?? false, formato: (v) => `${v}%` },
      ]
      for (const fila of filas) {
        const valorGrupo = fila.suficiente && fila.grupoValor !== null ? fila.formato(fila.grupoValor) : 'Sin datos suficientes'
        const row = benchmarkSheet.addRow([titulo, fila.label, fila.tu, valorGrupo])
        if (!fila.suficiente || fila.grupoValor === null) {
          row.getCell(4).font = { italic: true, color: { argb: 'FF9CA3AF' } }
        }
      }
    }
    benchmarkSheet.columns = [{ width: 24 }, { width: 22 }, { width: 14 }, { width: 20 }]
  }

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
