import { NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth/adminCrypto';

export async function POST(req: Request) {
  try {
    let token: string | null = null;

    // Check Header: x-admin-token
    const customHeaderToken = req.headers.get('x-admin-token');
    if (customHeaderToken) {
      token = customHeaderToken;
    }

    // Check Header: Authorization: Bearer <token>
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    // Check JSON body
    if (!token) {
      const body = await req.json().catch(() => ({}));
      if (body?.token && typeof body.token === 'string') {
        token = body.token;
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, authenticated: false, error: 'No token provided.' },
        { status: 401 }
      );
    }

    const verification = verifyAdminToken(token);

    if (!verification.valid || !verification.payload) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: verification.error || 'Invalid or expired admin token.',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        authenticated: true,
        role: verification.payload.role,
        expiresAt: verification.payload.expiresAt,
        issuedAt: verification.payload.issuedAt,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, authenticated: false, error: 'Internal verification error.' },
      { status: 500 }
    );
  }
}
