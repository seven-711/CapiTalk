import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple in-memory rate limiter for Vercel/Next.js edge cases
// (In a true distributed environment, use Redis/Upstash)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // 5 requests per minute per IP

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const deviceId = req.headers.get('x-device-id') || 'unknown';
    
    // LAYER 1: Basic Rate Limiting
    const now = Date.now();
    const rateRecord = rateLimitStore.get(ip) || { count: 0, resetAt: now + 60000 };
    if (now > rateRecord.resetAt) {
      rateRecord.count = 0;
      rateRecord.resetAt = now + 60000;
    }
    rateRecord.count += 1;
    rateLimitStore.set(ip, rateRecord);

    if (rateRecord.count > RATE_LIMIT) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { honeypot, postData } = body;

    // LAYER 8: Strict 60-second Server Cooldown Check per Device / IP
    const cooldownKey = `cooldown_${ip}_${deviceId}`;
    const lastPostTime = rateLimitStore.get(cooldownKey)?.resetAt || 0;
    const secondsSinceLast = (now - lastPostTime) / 1000;
    const isAdminMode = postData?.is_admin === true && postData?.author_alias?.includes('Admin');

    if (!isAdminMode && lastPostTime > 0 && secondsSinceLast < 60) {
      const waitSec = Math.ceil(60 - secondsSinceLast);
      return NextResponse.json({
        success: false,
        error: `⏳ Cooldown active. Please wait ${waitSec}s before publishing your next note.`
      }, { status: 429 });
    }

    // LAYER 9: Honeypot Fields
    if (honeypot && honeypot.trim().length > 0) {
      // Bots will fill this in. Instantly reject and pretend it worked.
      console.warn(`[BOT DETECTED] Honeypot filled by IP ${ip}, Device ${deviceId}`);
      return NextResponse.json({ success: true, message: 'Post created successfully.' }, { status: 200 });
    }

    if (!postData || !postData.id || !postData.message) {
      return NextResponse.json({ success: false, error: 'Invalid post data.' }, { status: 400 });
    }

    // LAYER 10: Server-side validation
    const message = postData.message.trim();
    if (message.length === 0 || message.length > 300) {
      return NextResponse.json({ success: false, error: 'Message must be between 1 and 300 characters.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Supabase configuration error.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // LAYER 3: Check Supabase banned_users table
    try {
      const authorId = postData.author_id;
      let queryFilter = `device_id.eq.${deviceId}`;
      if (authorId) queryFilter += `,user_id.eq.${authorId}`;
      const { data: bannedData } = await supabase
        .from('banned_users')
        .select('id')
        .or(queryFilter)
        .limit(1);

      if (bannedData && bannedData.length > 0) {
        console.warn(`[SHADOW BAN] Blocked post from banned user/device ${deviceId}`);
        return NextResponse.json({ success: true, message: 'Post created successfully.' }, { status: 200 });
      }
    } catch (e) {}

    // LAYER 3 cont: Device Fingerprinting & LAYER 11: Temporary Bans
    let riskScore = 0;
    let isBanned = false;
    let deviceSession = null;

    if (deviceId !== 'unknown') {
      try {
        const { data: session } = await supabase
          .from('device_sessions')
          .select('*')
          .eq('device_id', deviceId)
          .single();

        if (session) {
          deviceSession = session;
          isBanned = session.is_banned;
          riskScore = session.risk_score;

          if (isBanned) {
            // LAYER 5: Shadow Banning (Return 200 but don't insert)
            console.warn(`[SHADOW BAN] Blocked post from banned device ${deviceId}`);
            return NextResponse.json({ success: true, message: 'Post created successfully.' }, { status: 200 });
          }

          // LAYER 8: Cooldowns
          if (session.last_post_at) {
            const secondsSinceLastPost = (now - new Date(session.last_post_at).getTime()) / 1000;
            if (secondsSinceLastPost < 60) {
              return NextResponse.json({ success: false, error: `Cooldown active. Please wait ${Math.ceil(60 - secondsSinceLastPost)}s.` }, { status: 429 });
            }
          }
        }
      } catch (e) {
        // Table device_sessions may not exist yet in user's DB; continue gracefully
      }
    }

    // LAYER 6: Content Heuristics
    const urlCount = (message.match(/https?:\/\/[^\s]+/g) || []).length;
    if (urlCount > 2) riskScore += 20;

    const allCapsRatio = message.replace(/[^A-Z]/g, '').length / message.length;
    if (allCapsRatio > 0.8 && message.length > 20) riskScore += 10;

    const repeatedChars = /(.)\1{10,}/.test(message);
    if (repeatedChars) riskScore += 20;

    // LAYER 4: Risk Scoring Check
    if (riskScore >= 60) {
      isBanned = true;
    }

    // LAYER 7: Duplicate Detection
    try {
      const { data: recentPosts } = await supabase
        .from('freedom_posts')
        .select('message')
        .order('created_at', { ascending: false })
        .limit(10);
      
      const isDuplicate = recentPosts?.some(p => p.message.trim().toLowerCase() === message.toLowerCase());
      if (isDuplicate) {
        riskScore += 30; // Highly suspicious
        if (riskScore >= 60) isBanned = true;
        else return NextResponse.json({ success: false, error: 'Duplicate content detected.' }, { status: 400 });
      }
    } catch (e) {}

    // Update or Create Device Session
    if (deviceId !== 'unknown') {
      try {
        const sessionPayload = {
          device_id: deviceId,
          ip_address: ip,
          post_count: (deviceSession?.post_count || 0) + 1,
          risk_score: riskScore,
          is_banned: isBanned,
          last_post_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await supabase.from('device_sessions').upsert(sessionPayload);
      } catch (e) {}
    }

    if (isBanned) {
      // Return 200 to trick the bot (shadow ban)
      return NextResponse.json({ success: true, message: 'Post created successfully.' }, { status: 200 });
    }

    // LAYER 10 cont: Override client-provided privileged fields
    const finalStatus = isAdminMode ? 'approved' : 'pending';
    const finalColor = isAdminMode ? '#701a31' : (postData.color || '#ffc900');
    const encodedColor = `${finalColor}||${finalStatus}||{}`;

    const insertPayload: any = {
      id: postData.id,
      author_alias: postData.author_alias || 'Anon Student',
      department: postData.department || 'General',
      message: message,
      color: encodedColor,
      likes_count: 0, // Never trust client
      liked_by_users: [],
      created_at: new Date().toISOString(),
    };
    
    if (postData.author_id) insertPayload.author_id = postData.author_id;
    if (postData.dedicated_to) insertPayload.dedicated_to = postData.dedicated_to;
    if (postData.song_title) {
      insertPayload.song_title = postData.song_title;
      insertPayload.song_artist = postData.song_artist;
      insertPayload.song_image_url = postData.song_image_url;
      insertPayload.song_preview_url = postData.song_preview_url;
      insertPayload.song_link = postData.song_link;
    }

    let { error } = await supabase.from('freedom_posts').insert(insertPayload);

    if (error) {
      console.error('Supabase Insert Error:', error);

      // Retry 1: If dedicated_to column is missing from schema, strip it and retry
      if (error.message?.includes('dedicated_to')) {
        delete insertPayload.dedicated_to;
        const retry = await supabase.from('freedom_posts').insert(insertPayload);
        error = retry.error;
      }

      // Retry 2: If author_id column is missing from schema, strip it and retry
      if (error && error.message?.includes('author_id')) {
        delete insertPayload.author_id;
        const retry = await supabase.from('freedom_posts').insert(insertPayload);
        error = retry.error;
      }

      // Retry 3: If song_preview_url or song_link columns missing, strip them and retry
      if (error && (error.message?.includes('song_preview_url') || error.message?.includes('song_link'))) {
        delete insertPayload.song_preview_url;
        delete insertPayload.song_link;
        const retry = await supabase.from('freedom_posts').insert(insertPayload);
        error = retry.error;
      }

      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: `Database insert failed: ${error.message}` 
        }, { status: 500 });
      }
    }

    if (!isAdminMode) {
      rateLimitStore.set(cooldownKey, { count: 1, resetAt: now });
    }

    return NextResponse.json({ success: true, message: 'Post created successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Error in freedom-wall/post:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
