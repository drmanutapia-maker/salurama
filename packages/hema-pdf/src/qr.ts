import QRCode from 'qrcode'

/** Genera el PNG (Uint8Array) del código QR para `payload`. */
export async function generateQrPngBytes(payload: string): Promise<Uint8Array> {
  const buffer = await QRCode.toBuffer(payload, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  })
  return new Uint8Array(buffer)
}
