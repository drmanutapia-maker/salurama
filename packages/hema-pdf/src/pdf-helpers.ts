import { PDFFont, PDFPage, rgb } from 'pdf-lib'

export const MARGIN = 48
export const PAGE_WIDTH = 612 // Carta
export const PAGE_HEIGHT = 792 // Carta

export const COLOR_INK = rgb(0.067, 0.094, 0.153) // #111827
export const COLOR_MUTED = rgb(0.42, 0.45, 0.5) // #6B7280
export const COLOR_BRAND = rgb(0.118, 0.227, 0.373) // #1E3A5F
export const COLOR_BORDER = rgb(0.898, 0.906, 0.922) // #E5E7EB
export const COLOR_WARN = rgb(0.851, 0.467, 0.024) // #D97706
export const COLOR_ALERT = rgb(0.722, 0.110, 0.110) // #B91C1C

export interface PdfCursor {
  page: PDFPage
  y: number
  newPage: () => PDFPage
}

export function makeCursor(firstPage: PDFPage, newPage: () => PDFPage): PdfCursor {
  return { page: firstPage, y: PAGE_HEIGHT - MARGIN, newPage }
}

/** Garantiza que queden al menos `needed` puntos antes del margen inferior; si no, crea página nueva. */
export function ensureSpace(cursor: PdfCursor, needed: number): void {
  if (cursor.y - needed < MARGIN) {
    cursor.page = cursor.newPage()
    cursor.y = PAGE_HEIGHT - MARGIN
  }
}

/** Parte `text` en líneas que caben en `maxWidth` con `font`/`size` dados. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
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

/** Dibuja texto con wrap, avanzando el cursor. Crea páginas nuevas si hace falta. */
export function drawWrapped(
  cursor: PdfCursor,
  text: string,
  opts: { x: number; maxWidth: number; font: PDFFont; size: number; color: ReturnType<typeof rgb>; lineGap?: number },
): void {
  const lineHeight = opts.size + (opts.lineGap ?? 3)
  const lines = wrapText(text, opts.font, opts.size, opts.maxWidth)
  for (const line of lines) {
    ensureSpace(cursor, lineHeight)
    cursor.page.drawText(line, { x: opts.x, y: cursor.y, size: opts.size, font: opts.font, color: opts.color })
    cursor.y -= lineHeight
  }
}
