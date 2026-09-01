import { NextResponse } from 'next/server';
import { Innertube, UniversalCache } from 'youtubei.js';

let ytInstance: Innertube | null = null;
let ytInitPromise: Promise<Innertube> | null = null;

async function getInnertube(): Promise<Innertube> {
  if (ytInstance) return ytInstance;
  if (!ytInitPromise) {
    ytInitPromise = Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    }).then((instance) => {
      ytInstance = instance;
      return instance;
    });
  }
  return ytInitPromise;
}

function cleanSongTitle(str: string): string {
  if (!str) return '';
  return str
    .replace(/\s*\(Official.*?\)/gi, '')
    .replace(/\s*\[Official.*?\]/gi, '')
    .replace(/\s*\(Lyric.*?\)/gi, '')
    .replace(/\s*\[Lyric.*?\]/gi, '')
    .replace(/\s*\(Audio.*?\)/gi, '')
    .replace(/\s*\[Audio.*?\]/gi, '')
    .replace(/\s*\(MV\)/gi, '')
    .replace(/\s*\[MV\]/gi, '')
    .replace(/\s*\(Visualizer\)/gi, '')
    .replace(/\s*\(Visualizer Video\)/gi, '')
    .replace(/\s*\(Official HD.*?\)/gi, '')
    .replace(/\s*\(HD\)/gi, '')
    .replace(/\s*\(4K\)/gi, '')
    .trim();
}

function cleanArtistName(str: string): string {
  if (!str) return '';
  return str.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('id');
  const rawTitle = searchParams.get('title') || '';
  const rawArtist = searchParams.get('artist') || '';
  const rawQuery = searchParams.get('q') || '';

  const cleanTitle = cleanSongTitle(rawTitle);
  const cleanArtist = cleanArtistName(rawArtist);
  const cleanQuery = cleanSongTitle(rawQuery || `${cleanArtist} ${cleanTitle}`.trim());

  if (!videoId && !cleanTitle && !cleanQuery) {
    return NextResponse.json(
      { error: 'Provide at least "id", "title", or "q" parameter' },
      { status: 400 }
    );
  }

  // ── 1. Fast LRCLIB Primary Fetch ───────────────────────────────────────────
  try {
    if (cleanArtist && cleanTitle) {
      const lrclibDirect = await fetch(
        `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`,
        {
          headers: { 'User-Agent': 'CapiTalk-FreedomWall/1.0 (campus app)' },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (lrclibDirect.ok) {
        const data = await lrclibDirect.json();
        const plainText = data.plainLyrics || data.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]\s*/g, '');
        if (plainText && plainText.trim()) {
          return NextResponse.json({
            success: true,
            title: data.trackName || cleanTitle,
            artist: data.artistName || cleanArtist,
            lyrics: plainText.trim(),
            synced_lyrics: data.syncedLyrics || null,
            source: 'LRCLIB',
          });
        }
      }
    }

    // LRCLIB Search fallback with query
    if (cleanQuery) {
      const lrclibSearch = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(cleanQuery)}`,
        {
          headers: { 'User-Agent': 'CapiTalk-FreedomWall/1.0 (campus app)' },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (lrclibSearch.ok) {
        const searchData = await lrclibSearch.json();
        if (Array.isArray(searchData) && searchData.length > 0) {
          const top = searchData[0];
          const plainText = top.plainLyrics || top.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]\s*/g, '');
          if (plainText && plainText.trim()) {
            return NextResponse.json({
              success: true,
              title: top.trackName || cleanTitle,
              artist: top.artistName || cleanArtist,
              lyrics: plainText.trim(),
              synced_lyrics: top.syncedLyrics || null,
              source: 'LRCLIB Search',
            });
          }
        }
      }
    }
  } catch (e) {
    // Graceful fallback to YouTube Music
  }

  // ── 2. YouTube Music Innertube Direct Lyrics Fetch ─────────────────────────
  try {
    const yt = await getInnertube();
    let targetVideoId = videoId;
    let resolvedTitle = cleanTitle;
    let resolvedArtist = cleanArtist;

    if (!targetVideoId) {
      const searchTerm = cleanQuery || `${cleanArtist} ${cleanTitle}`.trim();
      try {
        const search = await yt.music.search(searchTerm, { type: 'song' });
        const songs = search.songs?.contents || search.contents?.[0]?.contents || [];
        if (songs.length > 0) {
          const topSong = songs[0] as any;
          targetVideoId = topSong.id;
          if (!resolvedTitle) resolvedTitle = topSong.title?.toString() || '';
          if (!resolvedArtist && Array.isArray(topSong.artists)) {
            resolvedArtist = topSong.artists.map((a: any) => a.name?.toString() || a.name || a.toString()).join(', ');
          }
        }
      } catch (searchErr) {
        console.warn('[Music Lyrics Search Warning]', searchErr);
      }
    }

    if (targetVideoId) {
      try {
        const lyricsObj = await yt.music.getLyrics(targetVideoId);
        const lyricsText = lyricsObj?.description?.text || '';

        if (lyricsText && lyricsText.trim()) {
          return NextResponse.json({
            success: true,
            videoId: targetVideoId,
            title: resolvedTitle || cleanTitle,
            artist: resolvedArtist || cleanArtist,
            lyrics: lyricsText.trim(),
            source: 'YouTube Music',
          });
        }
      } catch (lyricsErr: any) {
        console.warn('[YouTube Music Direct Lyrics Warning]', lyricsErr?.message || lyricsErr);
      }
    }
  } catch (error: any) {
    console.warn('[Innertube Lyrics Error]', error);
  }

  // ── 3. Secondary Fallback: lyrics.ovh ──────────────────────────────────────
  if (cleanArtist && cleanTitle) {
    try {
      const ovhRes = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
        { signal: AbortSignal.timeout(2500) }
      );
      if (ovhRes.ok) {
        const ovhData = await ovhRes.json();
        if (ovhData.lyrics && ovhData.lyrics.trim()) {
          return NextResponse.json({
            success: true,
            title: cleanTitle,
            artist: cleanArtist,
            lyrics: ovhData.lyrics.trim(),
            source: 'lyrics.ovh',
          });
        }
      }
    } catch (e) {}
  }

  return NextResponse.json({
    success: false,
    title: cleanTitle,
    artist: cleanArtist,
    lyrics: null,
    message: 'No official lyrics found for this track.',
  });
}
