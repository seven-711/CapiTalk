import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ success: false, error: 'File exceeds 10MB limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'image/webp';
    const ext = file.name.split('.').pop() || 'webp';
    const fileName = `posts/note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('freedom_media')
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadErr && uploadData) {
          const { data: pubData } = supabase.storage
            .from('freedom_media')
            .getPublicUrl(fileName);

          if (pubData?.publicUrl) {
            return NextResponse.json({
              success: true,
              url: pubData.publicUrl,
              fileName,
              storageType: 'supabase_cdn',
            });
          }
        } else if (uploadErr) {
          console.warn('[STORAGE_UPLOAD_WARN] Supabase storage upload:', uploadErr.message);
        }
      } catch (err: any) {
        console.warn('[STORAGE_UPLOAD_EXCEPTION]', err?.message);
      }
    }

    // Fallback: convert to base64 Data URL if storage bucket is not accessible
    const base64String = `data:${mimeType};base64,${buffer.toString('base64')}`;
    return NextResponse.json({
      success: true,
      url: base64String,
      fileName: file.name,
      storageType: 'base64_fallback',
    });

  } catch (error: any) {
    console.error('Upload route error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to process upload.' }, { status: 500 });
  }
}
