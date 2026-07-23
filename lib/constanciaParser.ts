// Parser de la "Cadena original" de la Constancia de Situación Profesional
// (SEP). Diseño "todo o nada": si el formato no coincide con lo esperado,
// nunca inventa ni prellena datos a medias — devuelve un error explícito
// para que el admin capture a mano.
//
// Estructura real confirmada contra 7 PDFs reales (ver investigación previa):
// la cadena es una sola línea (partida arbitrariamente por saltos de línea
// del PDF, incluso a media palabra/fecha) con segmentos separados por "|":
//   CEDULA|nombre|apellido1|apellido2|institución|título|fecha_titulación|
//     número_cédula|tipo|fecha_expedición   (9 campos tras el marcador)
//   CERTIFICACION|no_certificación|especialidad|organismo_certificador|
//     vigencia                              (4 campos tras el marcador)
// Un documento puede traer 0, 1 o varios bloques CERTIFICACION (0 si el
// médico aún no tiene certificación de consejo registrada en SEP para esa
// especialidad). La vigencia puede ser una fecha (AAAA-MM-DD) o texto no
// interpretable como fecha (ej. "INDEFINIDA").

const CEDULA_FIELD_COUNT = 9
const CERTIFICACION_FIELD_COUNT = 4

export interface ParsedCertification {
  numeroCertificacion: string
  especialidadTexto: string
  organismoCertificador: string
  vigenciaRaw: string
  vigenciaFecha: string | null
}

export interface ParsedConstancia {
  documentFolio: string | null
  folioConsistente: boolean
  certifications: ParsedCertification[]
  error: string | null
}

export function parseConstanciaText(text: string): ParsedConstancia {
  const folioMatches = [...text.matchAll(/(\d{6,})Folio:/g)].map(m => m[1])
  const documentFolio = folioMatches[0] ?? null
  const folioConsistente = folioMatches.length > 0 && folioMatches.every(f => f === folioMatches[0])

  const startIdx = text.indexOf('Cadena original')
  if (startIdx === -1) {
    return {
      documentFolio, folioConsistente, certifications: [],
      error: 'No se encontró la sección "Cadena original" en el PDF — no es el formato esperado de constancia SEP.',
    }
  }
  const endIdx = text.indexOf('Firma electronica', startIdx)
  const rawBlock = text.slice(startIdx + 'Cadena original'.length, endIdx === -1 ? undefined : endIdx)

  // Los saltos de línea del PDF pueden caer a media palabra o fecha — se
  // unen todas las líneas del bloque sin separador antes de partir por "|".
  const joined = rawBlock.split('\n').map(l => l.trim()).join('')
  const tokens = joined.split('|')

  const certifications: ParsedCertification[] = []
  let i = 0
  while (i < tokens.length) {
    const marker = tokens[i]
    if (marker === 'CEDULA') {
      if (i + CEDULA_FIELD_COUNT >= tokens.length) {
        return {
          documentFolio, folioConsistente, certifications,
          error: 'Formato de "Cadena original" inesperado (bloque CEDULA incompleto) — no se prellenó nada, captura a mano.',
        }
      }
      i += 1 + CEDULA_FIELD_COUNT
    } else if (marker === 'CERTIFICACION') {
      const fields = tokens.slice(i + 1, i + 1 + CERTIFICACION_FIELD_COUNT)
      if (fields.length < CERTIFICACION_FIELD_COUNT || fields.some(f => f === undefined)) {
        return {
          documentFolio, folioConsistente, certifications,
          error: 'Formato de "Cadena original" inesperado (bloque CERTIFICACION incompleto) — no se prellenó nada, captura a mano.',
        }
      }
      const [numeroCertificacion, especialidadTexto, organismoCertificador, vigenciaRaw] = fields
      const vigenciaFecha = /^\d{4}-\d{2}-\d{2}$/.test(vigenciaRaw) ? vigenciaRaw : null
      certifications.push({ numeroCertificacion, especialidadTexto, organismoCertificador, vigenciaRaw, vigenciaFecha })
      i += 1 + CERTIFICACION_FIELD_COUNT
    } else {
      // Separador vacío (los "||" del inicio/fin) u otro token no reconocido
      i += 1
    }
  }

  return { documentFolio, folioConsistente, certifications, error: null }
}

// Quita TODOS los espacios (no solo los repetidos) antes de comparar. El
// salto de línea del PDF a veces cae justo entre dos palabras y se pierde el
// espacio al reconstruir la cadena (ej. "CONSEJO MEXICANO DE HEMATOLOGIA"
// queda como "...DEHEMATOLOGIA") — confirmado con un PDF real. Quitar todos
// los espacios de ambos lados del comparativo hace que el emparejamiento sea
// insensible a este defecto de extracción, sin necesitar adivinar dónde iba
// el espacio.
export function normalizeForMatch(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[,.\s]/g, '')
}
