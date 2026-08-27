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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('id');
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');
  const query = searchParams.get('q');

  if (!videoId && !title && !query) {
    return NextResponse.json(
      { error: 'Provide at least "id", "title", or "q" parameter' },
      { status: 400 }
    );
  }

  try {
    const yt = await getInnertube();
    let targetVideoId = videoId;
    let resolvedTitle = title || '';
    let resolvedArtist = artist || '';

    // 1. If videoId is not given, search YouTube Music to find the song
    if (!targetVideoId) {
      const searchTerm = query || (artist && title ? `${artist} ${title}` : title || '');
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

    if (!targetVideoId) {
      return NextResponse.json(
        { success: false, error: 'Could not find a matching track for lyrics', lyrics: null },
        { status: 404 }
      );
    }

    // 2. Fetch lyrics using Innertube
    try {
      const lyricsObj = await yt.music.getLyrics(targetVideoId);
      const lyricsText = lyricsObj?.description?.text || '';

      if (lyricsText && lyricsText.trim()) {
        return NextResponse.json({
          success: true,
          videoId: targetVideoId,
          title: resolvedTitle,
          artist: resolvedArtist,
          lyrics: lyricsText.trim(),
          source: 'YouTube Music',
        });
      }
    } catch (lyricsErr: any) {
      console.warn('[YouTube Music Direct Lyrics Warning]', lyricsErr?.message || lyricsErr);
    }

    // 3. Fallback: Search general YouTube captions/description or secondary lyrics search
    return NextResponse.json({
      success: false,
      videoId: targetVideoId,
      title: resolvedTitle,
      artist: resolvedArtist,
      lyrics: null,
      message: 'No official lyrics available for this song on YouTube Music.',
    });
  } catch (error: any) {
    console.error('[Lyrics Route Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch lyrics' },
      { status: 500 }
    );
  }
}
