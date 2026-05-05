/**
 * Minimal TOTP implementation using Node.js built-in crypto.
 * RFC 6238 compliant — works with Google Authenticator.
 */
import { createHmac } from 'crypto'

// Base32 alphabet (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(input: string): Buffer {
  const s = input.replace(/=/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of s) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((value >> bits) & 0xff)
    }
  }
  return Buffer.from(out)
}

/** Generate the TOTP code for a given secret and time window */
export function generateTOTP(secret: string, window = 0): string {
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / 30) + window

  const buf = Buffer.alloc(8)
  // Write counter as 8-byte big-endian
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)

  const key = base32Decode(secret)
  const hmac = createHmac('sha1', key).update(buf).digest()

  const offset = hmac[hmac.length - 1] & 0x0f
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  return (code % 1_000_000).toString().padStart(6, '0')
}

/**
 * Verify a TOTP token, allowing ±1 time window for clock skew
 */
export function verifyTOTP(token: string, secret: string): boolean {
  if (!/^\d{6}$/.test(token)) return false
  for (const w of [-1, 0, 1]) {
    if (generateTOTP(secret, w) === token) return true
  }
  return false
}

/** Generate the otpauth:// URI for QR code scanning */
export function generateOTPAuthURI(secret: string, account: string, issuer: string): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits:    '6',
    period:    '30',
  })
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?${params}`
}
