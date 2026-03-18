import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '@/config/env';

/**
 * Verify that a password hash was signed with the correct shared secret.
 * Uses HMAC-SHA256 and timing-safe comparison to prevent timing attacks.
 */
export function verifyPasswordSignature(hashedPassword: string, signature: string): boolean {
  const expected = createHmac('sha256', env.authHashSecret)
    .update(hashedPassword)
    .digest('hex');

  if (expected.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}
