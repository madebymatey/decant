import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

/**
 * Symmetric encryption for per-project secrets stored in Postgres.
 *
 * AES-256-GCM. The key comes from SECRETS_ENCRYPTION_KEY (64 hex chars = 32
 * bytes; a base64 32-byte value is also accepted). Output format is three
 * base64 segments joined by dots: `iv.tag.ciphertext`.
 */

const ALGO = "aes-256-gcm"

function getKey(): Buffer {
  const raw = process.env.SECRETS_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("SECRETS_ENCRYPTION_KEY is not set")
  }
  // 64 hex chars → 32 bytes.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex")
  const buf = Buffer.from(raw, "base64")
  if (buf.length !== 32) {
    throw new Error("SECRETS_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64)")
  }
  return buf
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".")
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret")
  }
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

/** Mask a secret for display, showing only the last few characters. */
export function maskSecret(value: string, visible = 4): string {
  if (!value) return ""
  if (value.length <= visible) return "•".repeat(value.length)
  return "•".repeat(Math.max(4, value.length - visible)) + value.slice(-visible)
}
