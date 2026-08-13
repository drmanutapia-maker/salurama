// PostgREST representa columnas `bytea` como un string hex con prefijo
// "\x" tanto al leer como al escribir (ej. "\\x30590..."). Un Buffer/Uint8Array
// de Node no se serializa asi solo -- hay que convertirlo a mano en ambas
// direcciones.
export function uint8ArrayAHex(bytes: Uint8Array): string {
  return '\\x' + Buffer.from(bytes).toString('hex')
}

export function hexAUint8Array(hex: string): Uint8Array<ArrayBuffer> {
  const limpio = hex.startsWith('\\x') ? hex.slice(2) : hex
  // @simplewebauthn/server tipa su publicKey como el retorno exacto de
  // Uint8Array.prototype.slice() (respaldado por un ArrayBuffer concreto,
  // no ArrayBufferLike) -- de ahi la anotacion explicita de retorno.
  return new Uint8Array(Buffer.from(limpio, 'hex')).slice()
}
