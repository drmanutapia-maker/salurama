import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'

// Mismo patrón que packages/hema-pdf y lib/estadisticasPdf.ts: formas
// vectoriales dibujadas a mano con pdf-lib, sin librería de terceros.
// Este documento es un PROYECTO de anuncio para que el médico lo use como
// base al tramitar su Aviso de Publicidad ante COFEPRIS — no es el aviso
// en sí. El bloque LEYENDAS abajo genera el texto exigido por el Art. 19
// del Reglamento de la LGS en Materia de Publicidad a partir de los datos
// registrados del médico, pero sigue mostrando una advertencia explícita:
// requiere revisión de abogado antes de usarse en un trámite real (ese
// artículo no da un formato de leyenda fijo, a diferencia del de
// medicamentos -- ver investigación de la sesión que agregó este bloque).

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
  // Institución(es) que expidieron el título -- de doctor_education, sin
  // duplicados. Requerido por el Art. 19 del Reglamento de la LGS en
  // Materia de Publicidad (ver bloque LEYENDAS abajo).
  educationInstitutions: string[]
  // Certificados de especialidad ya VERIFICADOS únicamente -- no se declara
  // en el anuncio una credencial todavía sin confirmar.
  specialtyCredentials: { councilName: string; numeroCertificacion: string | null }[]
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

  // ── Leyendas legales — Art. 19, Reglamento de la LGS en Materia de
  // Publicidad: institución educativa que expidió el título y, en su caso,
  // cédula profesional / de especialidad. Generado a partir del perfil
  // registrado; solo se declaran especialidades ya VERIFICADAS. ──
  text('Leyendas legales (Art. 19, Reglamento de la LGS en Materia de Publicidad)', { x: MARGIN, size: 12, f: bold, color: COLOR_BRAND })
  cursor.y -= 18
  drawWrapped(
    'Quien ejerza actividades profesionales, técnicas o de especialidad de la salud debe expresar en su ' +
    'publicidad la institución educativa que le expidió el título, diploma o certificado correspondiente y, ' +
    'en su caso, su número de cédula profesional.',
    { x: MARGIN, maxWidth: PAGE_WIDTH - MARGIN * 2, size: 10, color: COLOR_MUTED, lineGap: 4 }
  )
  cursor.y -= 14

  const leyendas: string[] = [
    `Cédula profesional: ${data.professionalLicense || 'no registrada'}`,
  ]
  if (data.educationInstitutions.length > 0) {
    for (const inst of data.educationInstitutions) {
      leyendas.push(`Título profesional expedido por: ${inst}`)
    }
  } else {
    leyendas.push('Título profesional expedido por: [FALTA — agrega tu institución educativa en tu perfil antes de usar este documento]')
  }
  for (const cred of data.specialtyCredentials) {
    leyendas.push(`Certificado de especialidad: ${cred.councilName}${cred.numeroCertificacion ? `, No. ${cred.numeroCertificacion}` : ''}`)
  }

  for (const leyenda of leyendas) {
    ensureSpace(16)
    text('•', { x: MARGIN, size: 11, color: COLOR_TEAL })
    drawWrapped(leyenda, { x: MARGIN + 14, maxWidth: PAGE_WIDTH - MARGIN * 2 - 14, size: 11, color: COLOR_INK, lineGap: 3 })
    cursor.y -= 4
  }
  cursor.y -= 12

  // ── Advertencia visible: sigue requiriendo revisión de abogado ─────────
  // El Art. 19 no fija una redacción única para esta leyenda (a diferencia
  // de la publicidad de medicamentos, que sí tiene texto literal
  // obligatorio) -- por eso el texto de arriba, aunque real y basado en el
  // perfil del médico, no reemplaza la revisión legal antes de un trámite
  // real ante COFEPRIS.
  const advertenciaTitulo = 'ADVERTENCIA: REQUIERE REVISIÓN DE ABOGADO'
  const advertenciaTexto =
    'Estas leyendas se generaron automáticamente a partir de tu perfil registrado en Salurama. ' +
    'El Reglamento no fija una redacción única para este caso. Verifica que los datos sean exactos y ' +
    'haz revisar el texto por un abogado antes de usar este documento en un trámite real ante COFEPRIS.'
  const warnMaxWidth = PAGE_WIDTH - MARGIN * 2 - 32
  const advertenciaLineas = wrapText(advertenciaTexto, italic, 10, warnMaxWidth)
  const boxHeight = 22 + 18 + advertenciaLineas.length * 14 + 14

  ensureSpace(boxHeight)
  const boxTop = cursor.y
  cursor.page.drawRectangle({
    x: MARGIN, y: boxTop - boxHeight, width: PAGE_WIDTH - MARGIN * 2, height: boxHeight,
    color: COLOR_WARN_BG, borderColor: COLOR_WARN_BORDER, borderWidth: 1.5,
  })
  cursor.y = boxTop - 22
  text(advertenciaTitulo, { x: MARGIN + 16, size: 12, f: bold, color: COLOR_WARN_TEXT })
  cursor.y -= 18
  for (const linea of advertenciaLineas) {
    text(linea, { x: MARGIN + 16, size: 10, f: italic, color: COLOR_WARN_TEXT })
    cursor.y -= 14
  }

  cursor.y = boxTop - boxHeight - 24

  // ── Pie ──────────────────────────────────────────────────────────────
  ensureSpace(30)
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  text(`Generado por Salurama el ${fecha}, documento de apoyo, no es el aviso presentado ante COFEPRIS.`, {
    x: MARGIN, size: 8.5, color: COLOR_MUTED,
  })

  return doc.save()
}
