import crypto from 'crypto';

export interface AdminTokenPayload {
  role: 'admin';
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

const DEFAULT_SECRET = 'capitalk_admin_hardened_secret_key_v2_9f83a21e4d7c6b5';

function getAdminSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    DEFAULT_SECRET
  );
}

function getExpectedPasscode(): string {
  return process.env.ADMIN_ACCESS_PASSCODE || 'CapiTalk#Admin_2026!Secured';
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Validates a user-submitted passcode against the server's expected passcode using constant-time comparison
 */
export function validateAdminPasscode(inputPasscode: string): boolean {
  if (!inputPasscode || typeof inputPasscode !== 'string') return false;
  
  const expected = getExpectedPasscode().trim();
  const input = inputPasscode.trim();

  if (!expected || !input) return false;

  // Hash both with SHA-256 before timingSafeEqual to avoid leaking length
  const hashExpected = crypto.createHash('sha256').update(expected).digest();
  const hashInput = crypto.createHash('sha256').update(input).digest();

  return crypto.timingSafeEqual(hashExpected, hashInput);
}

/**
 * Generates a cryptographically signed HMAC SHA-256 session token
 */
export function generateAdminToken(durationHours: number = 24): { token: string; expiresAt: number } {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + durationHours * 60 * 60 * 1000;
  const nonce = crypto.randomBytes(16).toString('hex');

  const payload: AdminTokenPayload = {
    role: 'admin',
    issuedAt,
    expiresAt,
    nonce,
  };

  const payloadStr = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadStr);

  const secret = getAdminSecret();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64');
  const encodedSignature = base64UrlEncode(signature);

  const token = `${encodedPayload}.${encodedSignature}`;
  return { token, expiresAt };
}

/**
 * Verifies the validity, signature, and expiration of an admin session token
 */
export function verifyAdminToken(token: string | null | undefined): {
  valid: boolean;
  payload?: AdminTokenPayload;
  error?: string;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing token' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [encodedPayload, encodedSignature] = parts;

  try {
    const secret = getAdminSecret();
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('base64');
    const expectedEncodedSig = base64UrlEncode(expectedSig);

    const bufActual = Buffer.from(encodedSignature);
    const bufExpected = Buffer.from(expectedEncodedSig);

    if (bufActual.length !== bufExpected.length || !crypto.timingSafeEqual(bufActual, bufExpected)) {
      return { valid: false, error: 'Invalid token signature' };
    }

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload: AdminTokenPayload = JSON.parse(payloadJson);

    if (payload.role !== 'admin') {
      return { valid: false, error: 'Invalid token role' };
    }

    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'Session token expired' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token verification failed' };
  }
}
