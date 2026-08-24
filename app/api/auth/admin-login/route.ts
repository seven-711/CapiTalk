import { NextResponse } from 'next/server';
import { validateAdminPasscode, generateAdminToken } from '@/lib/auth/adminCrypto';

// In-memory rate limiting and brute force protection
interface AttemptRecord {
  failedAttempts: number;
  lockoutUntil: number;
  firstAttemptAt: number;
}

const loginAttempts = new Map<string, AttemptRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const WINDOW_DURATION_MS = 15 * 60 * 1000; // 15 minutes rolling window

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown_ip';
    const deviceId = req.headers.get('x-device-id') || 'unknown_device';
    const clientKey = `admin_login_${ip}_${deviceId}`;

    const now = Date.now();
    let record = loginAttempts.get(clientKey);

    // Clean up expired windows
    if (record && now - record.firstAttemptAt > WINDOW_DURATION_MS && now > record.lockoutUntil) {
      loginAttempts.delete(clientKey);
      record = undefined;
    }

    // Check if currently locked out
    if (record && record.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          error: `⛔ Too many failed login attempts. Access is locked for security. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
          lockoutSeconds: remainingSeconds,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { passcode } = body;

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Passcode is required.' },
        { status: 400 }
      );
    }

    const isValid = validateAdminPasscode(passcode);

    if (!isValid) {
      if (!record) {
        record = {
          failedAttempts: 1,
          lockoutUntil: 0,
          firstAttemptAt: now,
        };
      } else {
        record.failedAttempts += 1;
      }

      if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        record.lockoutUntil = now + LOCKOUT_DURATION_MS;
        loginAttempts.set(clientKey, record);
        const remainingMinutes = Math.ceil(LOCKOUT_DURATION_MS / 60000);
        return NextResponse.json(
          {
            success: false,
            error: `⛔ Security Alert: Maximum failed attempts exceeded. Admin access is locked for ${remainingMinutes} minutes.`,
            lockoutSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
          },
          { status: 429 }
        );
      }

      loginAttempts.set(clientKey, record);
      const attemptsRemaining = MAX_FAILED_ATTEMPTS - record.failedAttempts;

      return NextResponse.json(
        {
          success: false,
          error: `Incorrect admin passcode. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before temporary security lockout.`,
          attemptsRemaining,
        },
        { status: 401 }
      );
    }

    // Passcode is valid! Reset attempts and generate a signed session token
    loginAttempts.delete(clientKey);
    const { token, expiresAt } = generateAdminToken(24);

    return NextResponse.json(
      {
        success: true,
        message: 'Admin authentication successful.',
        token,
        expiresAt,
        role: 'admin',
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}
