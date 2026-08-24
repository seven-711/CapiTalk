'use client';

const ADMIN_TOKEN_KEY = 'capitalk_admin_session_v2';
const LEGACY_ADMIN_KEY = 'capitalk_admin_auth_v1';

export interface AdminLoginResponse {
  success: boolean;
  error?: string;
  lockoutSeconds?: number;
  attemptsRemaining?: number;
}

/**
 * Purges legacy insecure local storage flags to prevent authorization bypass
 */
export function purgeLegacyAdminKeys(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_ADMIN_KEY);
    sessionStorage.removeItem(LEGACY_ADMIN_KEY);
  } catch (e) {}
}

/**
 * Retrieves the cryptographically signed admin session token
 */
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    purgeLegacyAdminKeys();
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Stores the signed admin session token
 */
export function storeAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    purgeLegacyAdminKeys();
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}
}

/**
 * Clears all admin session tokens
 */
export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  try {
    purgeLegacyAdminKeys();
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}
}

/**
 * Performs server-side verification of the active admin session
 */
export async function verifyAdminSession(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;

  try {
    const res = await fetch('/api/auth/admin-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
    });

    if (!res.ok) {
      clearAdminToken();
      return false;
    }

    const data = await res.json();
    if (data.authenticated && data.role === 'admin') {
      return true;
    }

    clearAdminToken();
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Authenticates with the server admin login endpoint
 */
export async function loginAdmin(passcode: string): Promise<AdminLoginResponse> {
  purgeLegacyAdminKeys();
  
  try {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ passcode }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success || !data.token) {
      return {
        success: false,
        error: data.error || 'Authentication failed.',
        lockoutSeconds: data.lockoutSeconds,
        attemptsRemaining: data.attemptsRemaining,
      };
    }

    storeAdminToken(data.token);
    return { success: true };
  } catch (e: any) {
    return {
      success: false,
      error: 'Network connection failed. Please try again.',
    };
  }
}
