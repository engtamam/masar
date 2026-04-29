// File Encryption System
// AES encryption/decryption for file uploads using crypto-js

import CryptoJS from 'crypto-js'
import { getConfig } from './config'

/**
 * Encrypt a file buffer using AES
 * @param buffer - The file buffer to encrypt
 * @param keyRef - A reference key for the encryption (not the actual key)
 * @returns Encrypted buffer as Buffer
 */
export async function encryptFile(buffer: Buffer, keyRef: string): Promise<Buffer> {
  const encryptionKey = await getConfig('ENCRYPTION_KEY') || 'default-encryption-key-change-me'
  // Combine the platform key with the key reference for unique encryption per file
  const compositeKey = `${encryptionKey}:${keyRef}`

  const wordArray = CryptoJS.lib.WordArray.create(buffer as unknown as ArrayBuffer)
  const encrypted = CryptoJS.AES.encrypt(wordArray, compositeKey)

  // Convert to Buffer
  const encryptedStr = encrypted.toString()
  return Buffer.from(encryptedStr, 'utf-8')
}

/**
 * Decrypt an encrypted file buffer using AES
 * @param encryptedBuffer - The encrypted file buffer
 * @param keyRef - The reference key used during encryption
 * @returns Decrypted buffer as Buffer
 */
export async function decryptFile(encryptedBuffer: Buffer, keyRef: string): Promise<Buffer> {
  const encryptionKey = await getConfig('ENCRYPTION_KEY') || 'default-encryption-key-change-me'
  const compositeKey = `${encryptionKey}:${keyRef}`

  const encryptedStr = encryptedBuffer.toString('utf-8')
  const decrypted = CryptoJS.AES.decrypt(encryptedStr, compositeKey)

  // Convert WordArray to Buffer
  const words = decrypted.words
  const sigBytes = decrypted.sigBytes
  const bufferArray = new Uint8Array(sigBytes)

  for (let i = 0; i < sigBytes; i++) {
    const wordIndex = Math.floor(i / 4)
    const byteOffset = i % 4
    bufferArray[i] = (words[wordIndex] >>> (24 - byteOffset * 8)) & 0xff
  }

  return Buffer.from(bufferArray)
}

/**
 * Generate a unique key reference for file encryption
 * Based on file ID and timestamp
 */
export function generateKeyRef(fileId: string): string {
  return `file:${fileId}:${Date.now()}`
}
