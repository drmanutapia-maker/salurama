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

const buffer = fs.readFileSync(filePath);
pdfParse(buffer)
  .then(result => {
    fs.writeFileSync(outFile, result.text, 'utf8');
    process.exit(0);
  })
  .catch(err => {
    process.stderr.write('PDF_ERROR:' + err.message + '\n');
    process.exit(1);
  });
