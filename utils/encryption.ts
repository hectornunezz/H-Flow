import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const FORMAT_VERSION = 'v1'

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.ENCRYPTION_KEY
  if (!encodedKey) {
    throw new Error('Falta configurar ENCRYPTION_KEY con una clave Base64 de 32 bytes.')
  }

  const key = Buffer.from(encodedKey, 'base64')
  if (
    key.length !== 32 ||
    key.toString('base64').replace(/=+$/, '') !== encodedKey.replace(/=+$/, '')
  ) {
    throw new Error('ENCRYPTION_KEY debe ser una clave Base64 válida de exactamente 32 bytes.')
  }

  return key
}

export function encryptSensitiveData(plaintext: string): string {
  if (typeof plaintext !== 'string') {
    throw new TypeError('Los datos que se van a cifrar deben ser texto.')
  }

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [FORMAT_VERSION, iv.toString('base64url'), authTag.toString('base64url'), encrypted.toString('base64url')].join(
    ':',
  )
}

export function decryptSensitiveData(encryptedValue: string): string {
  if (typeof encryptedValue !== 'string') {
    throw new TypeError('Los datos que se van a descifrar deben ser texto.')
  }

  const [version, encodedIv, encodedAuthTag, encodedCiphertext, ...extra] =
    encryptedValue.split(':')

  if (
    version !== FORMAT_VERSION ||
    !encodedIv ||
    !encodedAuthTag ||
    encodedCiphertext === undefined ||
    extra.length > 0 ||
    !/^[A-Za-z0-9_-]*$/.test(encodedIv) ||
    !/^[A-Za-z0-9_-]*$/.test(encodedAuthTag) ||
    !/^[A-Za-z0-9_-]*$/.test(encodedCiphertext)
  ) {
    throw new Error('El valor cifrado tiene un formato no válido.')
  }

  const iv = Buffer.from(encodedIv, 'base64url')
  const authTag = Buffer.from(encodedAuthTag, 'base64url')
  const ciphertext = Buffer.from(encodedCiphertext, 'base64url')

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('El valor cifrado tiene un formato no válido.')
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)

  try {
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new Error('No se pudieron descifrar los datos; el contenido o la clave no coinciden.')
  }
}
