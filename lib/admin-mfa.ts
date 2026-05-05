/**
 * Shared helper for validating the admin_mfa session cookie.
 * Used by mfa-verify/route.ts and mfa-status/route.ts.
 */
import { createHmac } from 'crypto'

// Fail loudly if secret is not configured — never fall back to a hardcoded value
function getSecret(): string {
  const secret = process.env.ADMIN_TOTP_SECRET
  if (!secret) throw new Error('ADMIN_TOTP_SECRET environment variable is not set')
  return secret
}

export function validateMFACookie(cookie: string | undefined, email: string): boolean {
  if (!cookie) return false
  try {
    const [b64, sig] = cookie.split('.')
    if (!b64 || !sig) return false
    const payload = Buffer.from(b64, 'base64').toString('utf-8')
    const [cookieEmail, expiresStr] = payload.split(':')
    if (!cookieEmail || !expiresStr) return false
    if (cookieEmail.toLowerCase() !== email.toLowerCase()) return false
    if (Date.now() > parseInt(expiresStr, 10)) return false
    // Use FULL SHA-256 digest — never truncate (64 hex chars = 256 bits of security)
    const expected = createHmac('sha256', getSecret()).update(payload).digest('hex')
    return sig === expected
  } catch {
    return false
  }
}
