declare module 'pdf-parse' {
  interface PDFParseResult {
    text: string
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: unknown
    version: string
  }
  function pdfParse(buffer: Buffer): Promise<PDFParseResult>
  export = pdfParse
}
