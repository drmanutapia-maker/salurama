import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import type { EstadisticasData } from './estadisticasData'

// Mismo patrón que packages/hema-pdf: formas vectoriales dibujadas a mano con
// pdf-lib (drawRectangle/drawText), sin librería de charts ni captura de imagen.

const MARGIN = 48
const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792

const COLOR_INK = rgb(0.067, 0.094, 0.153) // #111827
const COLOR_MUTED = rgb(0.42, 0.45, 0.5) // #6B7280
const COLOR_BRAND = rgb(0.118, 0.227, 0.373) // #1E3A5F
const COLOR_BORDER = rgb(0.898, 0.906, 0.922) // #E5E7EB
const COLOR_TEAL = rgb(0.165, 0.616, 0.561) // #2A9D8F
const COLOR_AMBER = rgb(0.851, 0.467, 0.024) // #D97706
const COLOR_PURPLE = rgb(0.545, 0.361, 0.965) // #8B5CF6
const COLOR_RED = rgb(0.937, 0.267, 0.267) // #EF4444
const COLOR_TRACK = rgb(0.953, 0.957, 0.965) // #F3F4F6

interface Cursor {
  page: PDFPage
  y: number
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
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
  cursor.page.drawText(`${data.doctorNombre} — generado el ${fechaGenerado}`, { x: MARGIN, y: PAGE_HEIGHT - 80, size: 9, font, color: rgb(0.85, 0.88, 0.93) })
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
    text('Aún no hay reseñas verificadas.', { x: MARGIN, size: 10, color: COLOR_MUTED })
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

  // ── Últimas reseñas ──────────────────────────────────────────────────────
  if (data.reviews.length > 0) {
    sectionTitle('Últimas reseñas')
    for (const r of data.reviews.slice(0, 3)) {
      ensureSpace(40)
      // WinAnsi (fuentes estándar de pdf-lib) no puede codificar ★/☆ — se dibujan como círculos vectoriales.
      for (let i = 0; i < 5; i++) {
        cursor.page.drawEllipse({
          x: MARGIN + i * 12 + 4,
          y: cursor.y + 3,
          xScale: 4,
          yScale: 4,
          color: i < r.rating ? COLOR_AMBER : undefined,
          borderColor: COLOR_AMBER,
          borderWidth: 1,
        })
      }
      text('Paciente verificado', { x: MARGIN + 68, size: 10, f: bold, color: COLOR_INK })
      cursor.y -= 14
      const comment = r.comment?.trim() || '(sin comentario)'
      const lines = wrapText(comment, font, 9, PAGE_WIDTH - MARGIN * 2)
      for (const line of lines) {
        ensureSpace(13)
        text(line, { x: MARGIN, size: 9, color: COLOR_MUTED })
        cursor.y -= 13
      }
      cursor.y -= 8
    }
  }

  // ── Perfil completado ────────────────────────────────────────────────────
  sectionTitle('Perfil completado')
  text(`${data.completionPct}%`, { x: MARGIN, size: 12, f: bold, color: data.completionPct >= 80 ? COLOR_TEAL : data.completionPct >= 50 ? COLOR_AMBER : COLOR_RED })
  cursor.y -= 18
  for (const check of data.checks) {
    ensureSpace(16)
    // Círculo vectorial en vez de ✓/○ — WinAnsi no codifica esos glifos.
    cursor.page.drawEllipse({
      x: MARGIN + 4,
      y: cursor.y + 3,
      xScale: 4,
      yScale: 4,
      color: check.ok ? COLOR_TEAL : undefined,
      borderColor: check.ok ? COLOR_TEAL : COLOR_BORDER,
      borderWidth: 1,
    })
    text(check.label, { x: MARGIN + 16, size: 10, color: check.ok ? COLOR_INK : COLOR_MUTED })
    cursor.y -= 16
  }

  return doc.save()
}
