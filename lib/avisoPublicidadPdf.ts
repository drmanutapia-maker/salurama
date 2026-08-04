import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'

// Mismo patrón que packages/hema-pdf y lib/estadisticasPdf.ts: formas
// vectoriales dibujadas a mano con pdf-lib, sin librería de terceros.
// Este documento es un PROYECTO de anuncio para que el médico lo use como
// base al tramitar su Aviso de Publicidad ante COFEPRIS — no es el aviso
// en sí, y las leyendas legales obligatorias quedan marcadas como
// pendientes hasta revisión de un abogado (ver bloque LEYENDAS abajo).

const MARGIN = 48
const PAGE_WIDTH = 612 // Carta
const PAGE_HEIGHT = 792 // Carta

const COLOR_INK = rgb(0.067, 0.094, 0.153) // #111827
const COLOR_MUTED = rgb(0.42, 0.45, 0.5) // #6B7280
const COLOR_BRAND = rgb(0.118, 0.227, 0.373) // #1E3A5F
const COLOR_TEAL = rgb(0.165, 0.616, 0.561) // #2A9D8F
const COLOR_BORDER = rgb(0.898, 0.906, 0.922) // #E5E7EB
const COLOR_WARN_BG = rgb(1, 0.984, 0.922) // #FFFBEB
const COLOR_WARN_BORDER = rgb(0.996, 0.827, 0.502) // #FDE68A
const COLOR_WARN_TEXT = rgb(0.706, 0.325, 0.035) // #B45309

export interface AvisoPublicidadData {
  fullName: string
  professionalTitle: string | null
  specialty: string
  professionalLicense: string | null
  aboutMe: string | null
  photoUrl: string | null
}

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

async function fetchPhotoBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    return new Uint8Array(await res.arrayBuffer())
  } catch {
    return null
  }
}

export async function buildAvisoPublicidadPdf(data: AvisoPublicidadData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)

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

  function drawWrapped(str: string, opts: { x: number; maxWidth: number; size: number; f?: PDFFont; color?: ReturnType<typeof rgb>; lineGap?: number }) {
    const lineHeight = opts.size + (opts.lineGap ?? 3)
    for (const line of wrapText(str, opts.f ?? font, opts.size, opts.maxWidth)) {
      ensureSpace(lineHeight)
      text(line, { x: opts.x, size: opts.size, f: opts.f, color: opts.color })
      cursor.y -= lineHeight
    }
  }

  // ── Encabezado ──────────────────────────────────────────────────────
  text('SALURAMA', { x: MARGIN, size: 11, f: bold, color: COLOR_TEAL })
  cursor.y -= 22
  text('Proyecto de Anuncio Publicitario', { x: MARGIN, size: 20, f: bold, color: COLOR_BRAND })
  cursor.y -= 20
  drawWrapped(
    'Documento de apoyo para el trámite de Aviso de Publicidad ante COFEPRIS (Modalidad A). ' +
    'Este archivo es un borrador base. Revísalo y ajústalo antes de subirlo al portal oficial.',
    { x: MARGIN, maxWidth: PAGE_WIDTH - MARGIN * 2, size: 10, color: COLOR_MUTED, lineGap: 3 }
  )
  cursor.y -= 10

  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y }, end: { x: PAGE_WIDTH - MARGIN, y: cursor.y },
    thickness: 1, color: COLOR_BORDER,
  })
  cursor.y -= 28

  // ── Bloque del médico (foto + datos) ───────────────────────────────
  const photoSize = 84
  const photoBytes = data.photoUrl ? await fetchPhotoBytes(data.photoUrl) : null
  let photoImage = null
  if (photoBytes) {
    try {
      photoImage = await doc.embedJpg(photoBytes)
    } catch {
      try {
        photoImage = await doc.embedPng(photoBytes)
      } catch {
        photoImage = null
      }
    }
  }

  const blockTop = cursor.y
  if (photoImage) {
    cursor.page.drawImage(photoImage, { x: MARGIN, y: blockTop - photoSize, width: photoSize, height: photoSize })
  } else {
    cursor.page.drawRectangle({ x: MARGIN, y: blockTop - photoSize, width: photoSize, height: photoSize, color: rgb(0.914, 0.914, 0.961) })
    cursor.page.drawText((data.fullName[0] || '?').toUpperCase(), {
      x: MARGIN + photoSize / 2 - 8, y: blockTop - photoSize / 2 - 8, size: 24, font: bold, color: COLOR_BRAND,
    })
  }

  const textX = MARGIN + photoSize + 20
  const titlePrefix = data.professionalTitle ? `${data.professionalTitle} ` : ''
  cursor.y = blockTop - 4
  text(`${titlePrefix}${data.fullName}`, { x: textX, size: 15, f: bold, color: COLOR_INK })
  cursor.y -= 20
  text(data.specialty, { x: textX, size: 12, f: font, color: COLOR_TEAL })
  cursor.y -= 18
  text(
    data.professionalLicense ? `Cédula profesional: ${data.professionalLicense}` : 'Cédula profesional: no registrada',
    { x: textX, size: 11, color: COLOR_MUTED }
  )

  cursor.y = blockTop - photoSize - 30

  // ── Descripción / actividad profesional ────────────────────────────
  text('Descripción de la actividad profesional', { x: MARGIN, size: 12, f: bold, color: COLOR_BRAND })
  cursor.y -= 18
  const descripcion = (data.aboutMe && data.aboutMe.trim())
    || `Consulta médica especializada en ${data.specialty}.`
  drawWrapped(descripcion, { x: MARGIN, maxWidth: PAGE_WIDTH - MARGIN * 2, size: 11, color: COLOR_INK, lineGap: 5 })
  cursor.y -= 20

  // ── Datos que debe declarar el anuncio (estructura, sin redactar leyendas) ──
  text('Datos incluidos en este proyecto', { x: MARGIN, size: 12, f: bold, color: COLOR_BRAND })
  cursor.y -= 18
  const datos = [
    'Nombre completo y título profesional del anunciante.',
    'Especialidad médica declarada.',
    'Número de cédula profesional.',
    'Descripción de los servicios ofrecidos.',
  ]
  for (const d of datos) {
    ensureSpace(16)
    text('•', { x: MARGIN, size: 11, color: COLOR_TEAL })
    text(d, { x: MARGIN + 14, size: 11, color: COLOR_INK })
    cursor.y -= 16
  }
  cursor.y -= 12

  // ── Bloque de leyendas legales — placeholder explícito, sin inventar texto ──
  ensureSpace(110)
  const boxTop = cursor.y
  const boxHeight = 100
  cursor.page.drawRectangle({
    x: MARGIN, y: boxTop - boxHeight, width: PAGE_WIDTH - MARGIN * 2, height: boxHeight,
    color: COLOR_WARN_BG, borderColor: COLOR_WARN_BORDER, borderWidth: 1.5,
  })
  cursor.y = boxTop - 22
  text('[ LEYENDAS LEGALES: PENDIENTE DE REVISIÓN LEGAL ]', { x: MARGIN + 16, size: 12, f: bold, color: COLOR_WARN_TEXT })
  cursor.y -= 18
  drawWrapped(
    'Este espacio debe contener las leyendas obligatorias que exige la normativa de publicidad ' +
    'de servicios de salud (COFEPRIS / Ley General de Salud). El texto exacto está pendiente de ' +
    'aprobación por un abogado antes de usarse en un trámite real. No se generó automáticamente.',
    { x: MARGIN + 16, maxWidth: PAGE_WIDTH - MARGIN * 2 - 32, size: 10, f: italic, color: COLOR_WARN_TEXT, lineGap: 4 }
  )

  cursor.y = boxTop - boxHeight - 30

  // ── Pie ──────────────────────────────────────────────────────────────
  ensureSpace(30)
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  text(`Generado por Salurama el ${fecha}, documento de apoyo, no es el aviso presentado ante COFEPRIS.`, {
    x: MARGIN, size: 8.5, color: COLOR_MUTED,
  })

  return doc.save()
}
