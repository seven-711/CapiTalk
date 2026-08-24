import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/auth/adminCrypto';

// Simple in-memory rate limiter for Vercel/Next.js edge cases
// (In a true distributed environment, use Redis/Upstash)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // 5 requests per minute per IP

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const deviceId = req.headers.get('x-device-id') || 'unknown';
    const adminToken = req.headers.get('x-admin-token') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    
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

    // Verify Admin Status via Cryptographic Server Token
    let isVerifiedAdmin = false;
    if (adminToken) {
      const verification = verifyAdminToken(adminToken);
      if (verification.valid) {
        isVerifiedAdmin = true;
      }
    }

    // LAYER 8: Strict 60-second Server Cooldown Check per Device / IP
    const cooldownKey = `cooldown_${ip}_${deviceId}`;
    const lastPostTime = rateLimitStore.get(cooldownKey)?.resetAt || 0;
    const secondsSinceLast = (now - lastPostTime) / 1000;
    const isAdminMode = isVerifiedAdmin && postData?.is_admin === true;

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

    if (!postData || !postData.id || (!postData.message && !postData.song_title)) {
      return NextResponse.json({ success: false, error: 'Invalid post data.' }, { status: 400 });
    }

    // LAYER 10: Server-side validation
    const rawMessage = (postData.message || '').trim();
    const message = rawMessage || (postData.song_title ? `🎵 ${postData.song_title}${postData.song_artist ? ` - ${postData.song_artist}` : ''}` : '');

    if (!postData.song_title && (rawMessage.length === 0 || rawMessage.length > 300)) {
      return NextResponse.json({ success: false, error: 'Message must be between 1 and 300 characters.' }, { status: 400 });
    }
    if (rawMessage.length > 300) {
      return NextResponse.json({ success: false, error: 'Message cannot exceed 300 characters.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkmytopgtrizoxyphnmk.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_vbexy_paqhng1G_GbH7TEg_0OWWLV2-';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Supabase configuration error.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // LAYER 3: Check Supabase banned_users table (IP, Device, User ID, Username)
    try {
      const authorId = postData.author_id;
      const authorAlias = postData.author_alias;
      let queryFilter = `device_id.eq.${deviceId}`;
      if (ip && ip !== 'unknown') queryFilter += `,ip_address.eq.${ip}`;
      if (authorId) queryFilter += `,user_id.eq.${authorId}`;
      if (authorAlias) queryFilter += `,username.ilike.${authorAlias}`;

      const { data: bannedData } = await supabase
        .from('banned_users')
        .select('user_id')
        .or(queryFilter)
        .limit(1);

      if (bannedData && bannedData.length > 0) {
        console.warn(`[SHADOW BAN] Blocked post from banned user/device/IP ${ip} (${deviceId})`);
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
    const pollMeta = (postData.poll_options && postData.poll_options.length > 0)
      ? JSON.stringify({ question: postData.poll_question || '', options: postData.poll_options })
      : '';
    const profileMeta = JSON.stringify({
      avatar: postData.author_avatar || '',
      bio: postData.author_bio || '',
    });
    // Keep encodedColor short (< 200 chars) to prevent PostgreSQL VARCHAR length overflows
    const encodedColor = `${finalColor}||${finalStatus}||{}||${pollMeta}||${profileMeta}`;

    // Handle image upload: if base64, attempt to upload to Supabase storage 'freedom_media'
    let finalImageUrl = postData.image_url;
    if (finalImageUrl && typeof finalImageUrl === 'string' && finalImageUrl.startsWith('data:image/')) {
      try {
        const parts = finalImageUrl.split(',');
        const base64Data = parts[1];
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          const mimeMatch = finalImageUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/webp';
          const extension = mimeType.split('/')[1] || 'webp';
          const fileName = `posts/${postData.id}_${Date.now()}.${extension}`;

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('freedom_media')
            .upload(fileName, buffer, {
              contentType: mimeType,
              upsert: true,
            });

          if (!uploadErr && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('freedom_media')
              .getPublicUrl(fileName);
            if (publicUrlData?.publicUrl) {
              finalImageUrl = publicUrlData.publicUrl;
            }
          }
        }
      } catch (storageErr) {
        console.warn('Storage upload fallback:', storageErr);
      }
    }

    const safeAuthorAlias = isVerifiedAdmin && postData.is_admin === true
      ? (postData.author_alias || 'Admin')
      : (postData.author_alias === 'Admin' || postData.author_alias?.toLowerCase().startsWith('admin')
          ? 'Student'
          : (postData.author_alias || 'Anon Student'));

    const safeDepartment = isVerifiedAdmin && postData.is_admin === true
      ? 'Admin'
      : (postData.department?.toLowerCase() === 'admin' ? 'General' : (postData.department || 'General'));

    const insertPayload: any = {
      id: postData.id,
      author_alias: safeAuthorAlias,
      department: safeDepartment,
      message: message,
      color: encodedColor,
      likes_count: 0, // Never trust client
      liked_by_users: [],
      created_at: new Date().toISOString(),
    };
    
    if (isVerifiedAdmin && postData.is_admin === true) {
      insertPayload.is_admin = true;
      insertPayload.status = 'approved';
      if (postData.is_pinned) insertPayload.is_pinned = true;
    } else {
      insertPayload.is_admin = false;
      insertPayload.status = finalStatus;
    }

    if (postData.author_id) insertPayload.author_id = postData.author_id;
    if (postData.author_avatar) insertPayload.author_avatar = postData.author_avatar;
    if (postData.author_bio) insertPayload.author_bio = postData.author_bio;
    if (finalImageUrl) insertPayload.image_url = finalImageUrl;
    if (postData.image_type) insertPayload.image_type = postData.image_type;
    if (postData.dedicated_to) insertPayload.dedicated_to = postData.dedicated_to;
    if (postData.poll_question) insertPayload.poll_question = postData.poll_question;
    if (postData.poll_options && postData.poll_options.length > 0) insertPayload.poll_options = postData.poll_options;
    if (postData.song_title) {
      insertPayload.song_title = postData.song_title;
      insertPayload.song_artist = postData.song_artist;
      insertPayload.song_image_url = postData.song_image_url;
      insertPayload.song_preview_url = postData.song_preview_url;
      insertPayload.song_link = postData.song_link;
    }

    let { error } = await supabase.from('freedom_posts').insert(insertPayload);

    if (error) {
      console.warn('Supabase Insert initial attempt failed:', error.message);

      // Schema Compatibility Multi-Pass Retries
      const OPTIONAL_COLUMNS = [
        'image_url',
        'image_type',
        'status',
        'dedicated_to',
        'poll_question',
        'poll_options',
        'author_id',
        'author_avatar',
        'author_bio',
        'song_title',
        'song_artist',
        'song_image_url',
        'song_preview_url',
        'song_link',
      ];

      // Strip only columns explicitly missing or faulty according to error message
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!error) break;
        let modified = false;
        const errLower = (error.message || '').toLowerCase();

        for (const col of OPTIONAL_COLUMNS) {
          if (insertPayload[col] !== undefined) {
            // Only strip column if DB error specifically names this column as missing
            if (errLower.includes(`"${col.toLowerCase()}"`) || errLower.includes(`column ${col.toLowerCase()}`)) {
              delete insertPayload[col];
              modified = true;
            }
          }
        }

        // Also ensure color is simplified to 7-character hex if length was an issue
        if (errLower.includes('varying') || errLower.includes('value too long') || errLower.includes('character varying')) {
          if (insertPayload.color !== finalColor) {
            insertPayload.color = finalColor;
            modified = true;
          }
        }

        if (modified) {
          const retryRes = await supabase.from('freedom_posts').insert(insertPayload);
          error = retryRes.error;
        } else {
          break;
        }
      }

      // Final Absolute Core Fallback
      if (error) {
        console.warn('Attempting ultimate core payload insert fallback...');
        const corePayload = {
          id: postData.id,
          author_alias: postData.author_alias || 'Anon Student',
          department: postData.department || 'General',
          message: message,
          color: finalColor,
          likes_count: 0,
          liked_by_users: [],
          created_at: new Date().toISOString(),
        };
        const finalRetry = await supabase.from('freedom_posts').insert(corePayload);
        error = finalRetry.error;
      }

      if (error) {
        console.error('All insert attempts failed:', error);
        return NextResponse.json({ 
          success: false, 
          error: `Database insert failed: ${error.message}` 
        }, { status: 500 });
      }
    }

    if (!isAdminMode) {
      rateLimitStore.set(cooldownKey, { count: 1, resetAt: now });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Post created successfully.',
      post: insertPayload,
      imageUrl: finalImageUrl || null,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in freedom-wall/post:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error.' }, { status: 500 });
  }
}
