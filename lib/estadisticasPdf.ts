import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import type { EstadisticasData, TrendMetric, BenchmarkGrupo } from './estadisticasData'

// Mismo patrón que packages/hema-pdf: formas vectoriales dibujadas a mano con
// pdf-lib (drawRectangle/drawText), sin librería de charts ni captura de imagen.

const MARGIN = 48
const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792

const COLOR_INK = rgb(0.067, 0.094, 0.153) // #111827
const COLOR_MUTED = rgb(0.42, 0.45, 0.5) // #6B7280
const COLOR_BRAND = rgb(0.118, 0.227, 0.373) // #1E3A5F
const COLOR_TEAL = rgb(0.165, 0.616, 0.561) // #2A9D8F
const COLOR_AMBER = rgb(0.851, 0.467, 0.024) // #D97706
const COLOR_PURPLE = rgb(0.545, 0.361, 0.965) // #8B5CF6
const COLOR_RED = rgb(0.937, 0.267, 0.267) // #EF4444
const COLOR_TRACK = rgb(0.953, 0.957, 0.965) // #F3F4F6

interface Cursor {
  page: PDFPage
  y: number
}

export async function buildEstadisticasPdf(data: EstadisticasData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const newPage = () => doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const cursor: Cursor = { page: newPage(), y: PAGE_HEIGHT - MARGIN }

  function ensureSpace(needed: number) {
    if (cursor.y - needed < MARGIN) {
      cursor.page = newPage()
      cursor.y = PAGE_HEIGHT - MARGIN
    }
  }

  function text(str: string, opts: { x: number; size: number; f?: PDFFont; color?: ReturnType<typeof rgb> }) {
    cursor.page.drawText(str, { x: opts.x, y: cursor.y, size: opts.size, font: opts.f ?? font, color: opts.color ?? COLOR_INK })
  }

  function sectionTitle(title: string) {
    ensureSpace(28)
    cursor.y -= 6
    text(title, { x: MARGIN, size: 13, f: bold, color: COLOR_BRAND })
    cursor.y -= 18
  }

  function hBar(label: string, count: number, max: number, color: ReturnType<typeof rgb>) {
    ensureSpace(20)
    const barX = MARGIN + 140
    const barMaxWidth = PAGE_WIDTH - MARGIN - barX - 40
    const barWidth = max > 0 ? (count / max) * barMaxWidth : 0
    text(label, { x: MARGIN, size: 10, color: COLOR_MUTED })
    cursor.page.drawRectangle({ x: barX, y: cursor.y - 2, width: barMaxWidth, height: 10, color: COLOR_TRACK })
    if (barWidth > 0) {
      cursor.page.drawRectangle({ x: barX, y: cursor.y - 2, width: barWidth, height: 10, color })
    }
    text(String(count), { x: barX + barMaxWidth + 8, size: 10, f: bold, color: COLOR_INK })
    cursor.y -= 20
  }

  function vBars(items: { label: string; count: number }[], color: ReturnType<typeof rgb>) {
    ensureSpace(90)
    const chartHeight = 60
    const chartTop = cursor.y
    const chartWidth = PAGE_WIDTH - MARGIN * 2
    const colWidth = chartWidth / items.length
    const max = Math.max(...items.map((i) => i.count), 1)

    for (let i = 0; i < items.length; i++) {
      const { label, count } = items[i]
      const barH = (count / max) * chartHeight
      const barW = colWidth * 0.5
      const x = MARGIN + i * colWidth + (colWidth - barW) / 2
      if (count > 0) {
        cursor.page.drawRectangle({ x, y: chartTop - chartHeight, width: barW, height: barH, color })
      }
      const countStr = String(count)
      const countWidth = font.widthOfTextAtSize(countStr, 8)
      cursor.page.drawText(countStr, { x: x + barW / 2 - countWidth / 2, y: chartTop - chartHeight - 12, size: 8, font: bold, color: COLOR_INK })
      const labelWidth = font.widthOfTextAtSize(label, 8)
      cursor.page.drawText(label, { x: x + barW / 2 - labelWidth / 2, y: chartTop - chartHeight - 24, size: 8, font, color: COLOR_MUTED })
    }
    cursor.y = chartTop - chartHeight - 36
  }

  // ── Encabezado ──────────────────────────────────────────────────────────
  cursor.page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 90, width: PAGE_WIDTH, height: 90, color: COLOR_BRAND })
  cursor.page.drawText('Salurama', { x: MARGIN, y: PAGE_HEIGHT - 42, size: 22, font: bold, color: rgb(1, 1, 1) })
  cursor.page.drawText('Reporte de estadísticas', { x: MARGIN, y: PAGE_HEIGHT - 64, size: 12, font, color: rgb(1, 1, 1) })
  const fechaGenerado = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  cursor.page.drawText(`${data.doctorNombre}, generado el ${fechaGenerado}`, { x: MARGIN, y: PAGE_HEIGHT - 80, size: 9, font, color: rgb(0.85, 0.88, 0.93) })
  cursor.y = PAGE_HEIGHT - 90 - 28

  // ── KPIs ────────────────────────────────────────────────────────────────
  sectionTitle('Resumen')
  const kpis = [
    { label: 'Vistas al perfil', value: String(data.profileViews), color: COLOR_PURPLE },
    { label: 'Total citas', value: String(data.total), color: COLOR_BRAND },
    { label: 'Tasa confirmación', value: `${data.tasaConfirmacion}%`, color: COLOR_TEAL },
    { label: 'Rating promedio', value: data.reviews.length > 0 ? data.ratingPromedio.toFixed(1) : '—', color: COLOR_AMBER },
  ]
  ensureSpace(56)
  const kpiWidth = (PAGE_WIDTH - MARGIN * 2 - 24) / 4
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (kpiWidth + 8)
    cursor.page.drawRectangle({ x, y: cursor.y - 48, width: kpiWidth, height: 48, color: COLOR_TRACK })
    const valWidth = bold.widthOfTextAtSize(k.value, 18)
    cursor.page.drawText(k.value, { x: x + kpiWidth / 2 - valWidth / 2, y: cursor.y - 22, size: 18, font: bold, color: k.color })
    const labelWidth = font.widthOfTextAtSize(k.label, 8)
    cursor.page.drawText(k.label, { x: x + kpiWidth / 2 - labelWidth / 2, y: cursor.y - 38, size: 8, font, color: COLOR_MUTED })
  })
  cursor.y -= 68

  // ── Tendencia mensual (beneficio Premium — quien genera este PDF ya lo
  // tiene, no hace falta gate adicional aquí) ────────────────────────────
  function formatTendencia(t: TrendMetric): { texto: string; color: ReturnType<typeof rgb> } {
    if (t.direccion === 'nuevo') return { texto: 'Nuevo este mes', color: COLOR_TEAL }
    if (t.direccion === 'flat') return { texto: 'Sin cambio vs. mes anterior', color: COLOR_MUTED }
    const pct = t.cambioPct !== null ? `${t.direccion === 'up' ? '+' : ''}${Math.round(t.cambioPct)}%` : ''
    const texto = `${t.direccion === 'up' ? 'Subió' : 'Bajó'} ${pct} vs. mes anterior`
    return { texto, color: t.direccion === 'up' ? COLOR_TEAL : COLOR_RED }
  }

  sectionTitle('Tendencia mensual')
  const filasTendencia: { label: string; trend: TrendMetric; valor: string }[] = [
    { label: 'Vistas al perfil', trend: data.tendencias.vistas, valor: String(data.tendencias.vistas.actual) },
    { label: 'Calificación', trend: data.tendencias.calificacion, valor: data.tendencias.calificacion.actual.toFixed(1) },
    { label: 'Reseñas nuevas', trend: data.tendencias.reseñas, valor: String(data.tendencias.reseñas.actual) },
  ]
  for (const fila of filasTendencia) {
    ensureSpace(18)
    const prefijo = `${fila.label}: ${fila.valor} este mes, `
    text(prefijo, { x: MARGIN, size: 10, color: COLOR_INK })
    const { texto, color } = formatTendencia(fila.trend)
    const prefijoWidth = font.widthOfTextAtSize(prefijo, 10)
    text(texto, { x: MARGIN + prefijoWidth, size: 10, f: bold, color })
    cursor.y -= 18
  }

  // ── Distribución de citas ──────────────────────────────────────────────
  sectionTitle('Distribución de citas')
  if (data.total === 0) {
    text('Aún no hay citas registradas.', { x: MARGIN, size: 10, color: COLOR_MUTED })
    cursor.y -= 20
  } else {
    const maxStatus = Math.max(data.porStatus.pending_verification, data.porStatus.confirmed, data.porStatus.completed, data.porStatus.cancelled, 1)
    hBar('Pendientes', data.porStatus.pending_verification, maxStatus, COLOR_AMBER)
    hBar('Confirmadas', data.porStatus.confirmed, maxStatus, COLOR_TEAL)
    hBar('Completadas', data.porStatus.completed, maxStatus, COLOR_PURPLE)
    hBar('Canceladas', data.porStatus.cancelled, maxStatus, COLOR_RED)
  }

  // ── Últimos 6 meses ─────────────────────────────────────────────────────
  sectionTitle('Últimos 6 meses')
  vBars(data.citasPorMes, COLOR_BRAND)

  // ── Citas por día de semana ─────────────────────────────────────────────
  sectionTitle('Citas por día de semana')
  vBars(data.citasPorDia, COLOR_TEAL)

  // ── Distribución de reseñas ─────────────────────────────────────────────
  sectionTitle('Distribución de reseñas')
  if (data.reviews.length === 0) {
    text('Aún no hay reseñas.', { x: MARGIN, size: 10, color: COLOR_MUTED })
    cursor.y -= 20
  } else {
    const maxRating = Math.max(...data.ratingDist.map((r) => r.count), 1)
    for (const r of data.ratingDist) {
      hBar(`${r.stars} estrella${r.stars !== 1 ? 's' : ''}`, r.count, maxRating, COLOR_AMBER)
    }
    ensureSpace(16)
    text(`Promedio: ${data.ratingPromedio.toFixed(1)} de ${data.reviews.length} reseña${data.reviews.length !== 1 ? 's' : ''}`, { x: MARGIN, size: 10, f: bold, color: COLOR_INK })
    cursor.y -= 20
  }

  // ── Cómo te comparas (benchmark de especialidad, beneficio Premium —
  // mismo criterio que la tendencia mensual: quien genera este PDF ya lo
  // tiene, no hace falta gate adicional aquí) ────────────────────────────
  if (data.benchmark) {
    sectionTitle('Cómo te comparas')
    const tuRatingTexto = data.reviews.length > 0 ? `${data.ratingPromedio.toFixed(1)} estrellas` : 'sin dato'
    const grupos: { titulo: string; grupo: BenchmarkGrupo | null }[] = [
      { titulo: `${data.benchmark.especialidad}: toda la plataforma`, grupo: data.benchmark.nacional },
      { titulo: `${data.benchmark.especialidad}: ${data.benchmark.ciudad || 'sin ciudad registrada'}`, grupo: data.benchmark.ciudadGrupo },
    ]
    for (const { titulo, grupo } of grupos) {
      ensureSpace(18)
      text(titulo, { x: MARGIN, size: 10, f: bold, color: COLOR_BRAND })
      cursor.y -= 16

      const filas = [
        { label: 'Rating promedio', tuTexto: tuRatingTexto, grupoValor: grupo?.ratingPromedio ?? null, suficiente: grupo?.ratingSuficiente ?? false, formato: (v: number) => `${v.toFixed(1)} estrellas` },
        { label: 'Tasa de confirmación', tuTexto: `${data.tasaConfirmacion}%`, grupoValor: grupo?.tasaConfirmacion ?? null, suficiente: grupo?.tasaSuficiente ?? false, formato: (v: number) => `${v}%` },
      ]
      for (const fila of filas) {
        ensureSpace(16)
        const prefijo = `${fila.label}: Tú ${fila.tuTexto}, `
        text(prefijo, { x: MARGIN + 12, size: 9, color: COLOR_MUTED })
        const prefijoWidth = font.widthOfTextAtSize(prefijo, 9)
        if (fila.suficiente && fila.grupoValor !== null) {
          text(`Grupo ${fila.formato(fila.grupoValor)}`, { x: MARGIN + 12 + prefijoWidth, size: 9, f: bold, color: COLOR_INK })
        } else {
          text('Aún no hay datos suficientes', { x: MARGIN + 12 + prefijoWidth, size: 9, color: COLOR_MUTED })
        }
        cursor.y -= 16
      }
      cursor.y -= 6
    }
  }

  return doc.save()
}
