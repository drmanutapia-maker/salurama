import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const PREFIX = 'v1'
const BUFFER_VERSION = 1

let _key: Buffer | null = null

function getKey(): Buffer {
  if (_key) return _key
  const raw = process.env.CHAT_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('CHAT_ENCRYPTION_KEY no está configurada')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_LENGTH) {
    throw new Error(`CHAT_ENCRYPTION_KEY debe decodificar a ${KEY_LENGTH} bytes (recibidos: ${key.length})`)
  }
  _key = key
  return _key
}

/**
 * AES-256-GCM con IV aleatorio por llamada. Salida: "v1.<iv_b64>.<authTag_b64>.<ciphertext_b64>".
 */
export function cifrar(texto: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [PREFIX, iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.')
}

/**
 * Compatible hacia atrás: valores sin el prefijo "v1." se devuelven tal cual
 * (mensajes anteriores al cifrado, hasta que corra el backfill de la Parte 5).
 */
export function descifrar(valor: string): string {
  if (!valor.startsWith(`${PREFIX}.`)) return valor

  const partes = valor.split('.')
  if (partes.length !== 4) {
    throw new Error('Formato de contenido cifrado inválido')
  }
  const [, ivB64, authTagB64, ciphertextB64] = partes
  const key = getKey()
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const texto = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return texto.toString('utf8')
}

/**
 * Igual que cifrar(), pero para binario arbitrario (archivos) en vez de texto.
 * Formato compacto, sin base64: [1 byte versión][12 bytes iv][16 bytes authTag][ciphertext].
 */
export function cifrarBuffer(buffer: Buffer): Buffer {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([Buffer.from([BUFFER_VERSION]), iv, authTag, ciphertext])
}

export function descifrarBuffer(buffer: Buffer): Buffer {
  const version = buffer[0]
  if (version !== BUFFER_VERSION) {
    throw new Error(`Versión de cifrado de archivo no soportada: ${version}`)
  }
  const key = getKey()
  const iv = buffer.subarray(1, 1 + IV_LENGTH)
  const authTag = buffer.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(1 + IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
