'use strict';
// Worker: parses a PDF and writes extracted text to outFile.
// Runs in isolation so pdf-parse's memory is freed when this process exits.
const pdfParse = require('pdf-parse');
const fs = require('fs');

const filePath = process.argv[2];
const outFile  = process.argv[3];

if (!filePath || !outFile) {
  process.stderr.write('Usage: node pdf-extract-worker.cjs <pdfPath> <outFile>\n');
  process.exit(1);
}

// El renderer por defecto de pdf-parse (node_modules/pdf-parse/lib/pdf-parse.js)
// solo compara la coordenada Y entre items de texto consecutivos: si están en
// la misma línea, los concatena SIN NINGÚN separador, sin importar la
// distancia horizontal real entre ellos. Eso es correcto para texto corrido
// (cada item de pdfjs ya trae su espacio real dentro del string), pero rompe
// tablas de columnas angostas — dos columnas en la misma línea base quedan
// pegadas. Confirmado 2026-09-07 reproduciendo esto directo contra
// Zanwar_Rajkumar_2025_Risk_stratification_staging.pdf (tabla de riesgo IMWG
// de MGUS): "IMWG Risk Category" + "Relative Risk of" -> "IMWG Risk
// CategoryRelative Risk of" ya en la salida cruda de pdf-parse, antes de que
// ingest-msl-papers.js toque nada.
//
// Fix: usar las coordenadas x/y reales de cada item (que pdfjs sí expone en
// textContent.items, vía item.transform y item.width) para medir la
// distancia horizontal real entre items consecutivos de una misma línea, e
// insertar un espacio cuando esa distancia supere un umbral relativo al
// tamaño de fuente del item — no un heurístico de texto (buscar
// minúscula+MAYÚSCULA pegadas) como el usado para JATS, que generaba falsos
// positivos con nombres propios/marcas. Aquí sí hay estructura real
// (coordenadas) disponible para medir la distancia real, igual que se usó la
// estructura real del XML (tags) para el fix de JATS.
//
// Umbral calibrado contra datos reales de esta sesión: un espacio de palabra
// normal mide ~0.3x el tamaño de fuente (ej. gap de 3.05pt a fuente de
// 8.97pt); el gap real entre columnas de tabla mide 2x-7x el tamaño de
// fuente (17.5pt-56.4pt a esa misma fuente). Un umbral de 0.15x separa
// limpiamente ambos casos de las uniones de glifos genuinas (gap ~0 — texto
// partido por cambio de fuente/estilo pero sin espacio real en el original,
// ej. un número de referencia en superíndice seguido de "[").
const GAP_THRESHOLD_RATIO = 0.15;
const MIN_GAP_THRESHOLD   = 0.5; // puntos PDF — piso para fuentes muy pequeñas (notas al pie)

function renderPageWithRealSpacing(pageData) {
  return pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
    .then(textContent => {
      let text = '';
      let lastY = null;
      let lastRightEdge = null;

      for (const item of textContent.items) {
        const x = item.transform[4];
        const y = item.transform[5];
        const fontSize = Math.abs(item.transform[0]) || 1;
        const width = item.width || 0;

        if (lastY === null || lastY !== y) {
          // Línea nueva — mismo criterio que el renderer por defecto de pdf-parse.
          text += (lastY === null ? '' : '\n') + item.str;
        } else {
          const gap = lastRightEdge === null ? 0 : x - lastRightEdge;
          const threshold = Math.max(MIN_GAP_THRESHOLD, fontSize * GAP_THRESHOLD_RATIO);
          text += (gap > threshold ? ' ' : '') + item.str;
        }

        lastY = y;
        lastRightEdge = x + width;
      }
      return text;
    });
}

const buffer = fs.readFileSync(filePath);
pdfParse(buffer, { pagerender: renderPageWithRealSpacing })
  .then(result => {
    fs.writeFileSync(outFile, result.text, 'utf8');
    process.exit(0);
  })
  .catch(err => {
    process.stderr.write('PDF_ERROR:' + err.message + '\n');
    process.exit(1);
  });
