import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || '';
    const username = url.searchParams.get('username') || '';
    const deviceId = url.searchParams.get('deviceId') || '';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: true,
        ip,
        deviceId,
        isBanned: false,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query filter to check user_id, device_id, ip_address, OR username
    const filterParts: string[] = [];
    if (ip && ip !== 'unknown') filterParts.push(`ip_address.eq.${ip}`);
    if (userId) filterParts.push(`user_id.eq.${userId}`);
    if (deviceId) filterParts.push(`device_id.eq.${deviceId}`);
    if (username) filterParts.push(`username.ilike.${username}`);

    if (filterParts.length === 0) {
      return NextResponse.json({ success: true, ip, deviceId, isBanned: false });
    }

    const { data: bans, error } = await supabase
      .from('banned_users')
      .select('user_id, device_id, ip_address, username, reason')
      .or(filterParts.join(','))
      .limit(1);

    if (error) {
      console.warn('[ban-check] Supabase check error:', error.message);
      return NextResponse.json({ success: true, ip, deviceId, isBanned: false });
    }

    if (bans && bans.length > 0) {
      const match = bans[0];
      return NextResponse.json({
        success: true,
        ip,
        deviceId,
        isBanned: true,
        banReason: match.reason || 'Account or IP address restricted by CapiTalk Administrator.',
      });
    }

    return NextResponse.json({
      success: true,
      ip,
      deviceId,
      isBanned: false,
    });
  } catch (error) {
    console.error('[ban-check] Internal Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
