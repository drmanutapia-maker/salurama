import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import type { ResenasData } from './resenasData'

// Mismo patrón que lib/estadisticasPdf.ts: formas vectoriales dibujadas a
// mano con pdf-lib, sin librería de charts ni captura de imagen.

const MARGIN = 48
const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792

const COLOR_INK = rgb(0.067, 0.094, 0.153) // #111827
const COLOR_MUTED = rgb(0.42, 0.45, 0.5) // #6B7280
const COLOR_BRAND = rgb(0.118, 0.227, 0.373) // #1E3A5F
const COLOR_AMBER = rgb(0.851, 0.467, 0.024) // #D97706
const COLOR_TRACK = rgb(0.953, 0.957, 0.965) // #F3F4F6

interface Cursor {
  page: PDFPage
  y: number
}

// pdf-lib no ajusta texto largo automáticamente — necesario aquí porque,
// a diferencia de estadisticasPdf.ts (solo números y etiquetas cortas),
// los comentarios de reseñas son texto libre de longitud variable.
function wrapText(str: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = str.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (current && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function buildResenasPdf(data: ResenasData): Promise<Uint8Array> {
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

  // ── Encabezado ──────────────────────────────────────────────────────────
  cursor.page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 90, width: PAGE_WIDTH, height: 90, color: COLOR_BRAND })
  cursor.page.drawText('Salurama', { x: MARGIN, y: PAGE_HEIGHT - 42, size: 22, font: bold, color: rgb(1, 1, 1) })
  cursor.page.drawText('Reporte de reseñas', { x: MARGIN, y: PAGE_HEIGHT - 64, size: 12, font, color: rgb(1, 1, 1) })
  const fechaGenerado = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  cursor.page.drawText(`${data.doctorNombre}, generado el ${fechaGenerado}`, { x: MARGIN, y: PAGE_HEIGHT - 80, size: 9, font, color: rgb(0.85, 0.88, 0.93) })
  cursor.y = PAGE_HEIGHT - 90 - 28

  // ── Resumen ─────────────────────────────────────────────────────────────
  sectionTitle('Resumen')
  ensureSpace(56)
  const kpis = [
    { label: 'Total de reseñas', value: String(data.total), color: COLOR_BRAND },
    { label: 'Rating promedio', value: data.total > 0 ? data.ratingPromedio.toFixed(1) : '—', color: COLOR_AMBER },
  ]
  const kpiWidth = (PAGE_WIDTH - MARGIN * 2 - 8) / 2
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (kpiWidth + 8)
    cursor.page.drawRectangle({ x, y: cursor.y - 48, width: kpiWidth, height: 48, color: COLOR_TRACK })
    const valWidth = bold.widthOfTextAtSize(k.value, 18)
    cursor.page.drawText(k.value, { x: x + kpiWidth / 2 - valWidth / 2, y: cursor.y - 22, size: 18, font: bold, color: k.color })
    const labelWidth = font.widthOfTextAtSize(k.label, 8)
    cursor.page.drawText(k.label, { x: x + kpiWidth / 2 - labelWidth / 2, y: cursor.y - 38, size: 8, font, color: COLOR_MUTED })
  })
  cursor.y -= 68

  // ── Distribución por calificación ──────────────────────────────────────
  sectionTitle('Distribución por calificación')
  if (data.total === 0) {
    text('Aún no hay reseñas verificadas.', { x: MARGIN, size: 10, color: COLOR_MUTED })
    cursor.y -= 20
  } else {
    const maxRating = Math.max(...data.ratingDist.map((r) => r.count), 1)
    for (const r of data.ratingDist) {
      hBar(`${r.stars} estrella${r.stars !== 1 ? 's' : ''}`, r.count, maxRating, COLOR_AMBER)
    }
  }

  // ── Todas las reseñas ───────────────────────────────────────────────────
  sectionTitle(`Todas las reseñas (${data.total})`)
  if (data.total === 0) {
    text('Aún no hay reseñas verificadas.', { x: MARGIN, size: 10, color: COLOR_MUTED })
  } else {
    const maxCommentWidth = PAGE_WIDTH - MARGIN * 2
    for (const r of data.reviews) {
      ensureSpace(28)
      const fecha = new Date(r.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      text(`${r.rating}/5`, { x: MARGIN, size: 10, f: bold, color: COLOR_AMBER })
      text(fecha, { x: MARGIN + 32, size: 9, color: COLOR_MUTED })
      cursor.y -= 14
      if (r.comment) {
        for (const line of wrapText(r.comment, font, 9, maxCommentWidth)) {
          ensureSpace(12)
          text(line, { x: MARGIN, size: 9, color: COLOR_INK })
          cursor.y -= 12
        }
      }
      cursor.y -= 8
    }
  }

  return doc.save()
}
