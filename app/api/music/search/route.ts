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
  const query = searchParams.get('q');

  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required', tracks: [] },
      { status: 400 }
    );
  }

  const cleanQuery = query.trim();

  try {
    const yt = await getInnertube();

    let rawSongs: any[] = [];

    // 1. Search YouTube Music for songs
    try {
      const musicSearch = await yt.music.search(cleanQuery, { type: 'song' });
      rawSongs = musicSearch.songs?.contents || musicSearch.contents?.[0]?.contents || [];
    } catch (e) {
      console.warn('[YouTube Music Search Warning]', e);
    }

    // 2. Fallback: General YouTube search if YouTube Music has no tracks
    if (!rawSongs || rawSongs.length === 0) {
      try {
        const videoSearch = await yt.search(`${cleanQuery} song audio`, { type: 'video' });
        rawSongs = videoSearch.videos || [];
      } catch (e) {
        console.warn('[YouTube General Search Fallback]', e);
      }
    }

    // 3. Format track metadata
    const formattedTracks = rawSongs.slice(0, 8).map((s: any) => {
      const title = s.title?.toString() || s.name?.toString() || cleanQuery;
      let artist = 'Unknown Artist';
      if (Array.isArray(s.artists) && s.artists.length > 0) {
        artist = s.artists.map((a: any) => a.name?.toString() || a.name || a.toString()).join(', ');
      } else if (s.author?.name) {
        artist = s.author.name.toString().replace(/ - Topic$/, '').replace(/VEVO$/, '');
      }

      const thumbs = s.thumbnails || s.thumbnail?.contents || [];
      const bestThumb = thumbs[thumbs.length - 1]?.url || thumbs[0]?.url || s.best_thumbnail?.url || '';
      // Enhance thumbnail to high resolution (544x544) if available
      const hdThumb = bestThumb ? bestThumb.replace(/=w\d+-h\d+/, '=w544-h544') : '';

      const trackId = s.id || '';
      const durationStr = s.duration?.text || s.duration?.toString() || '';

      return {
        id: trackId,
        name: title,
        title: title,
        artist: artist,
        duration: durationStr,
        image_url: hdThumb || bestThumb || '/avatars/coin-left.jpg',
        url: trackId ? `https://www.youtube.com/watch?v=${trackId}` : '',
        song_link: trackId ? `https://www.youtube.com/watch?v=${trackId}` : '',
        preview_url: '',
      };
    });

    // 4. Enrich with iTunes 30-sec preview audio (in parallel with 2.5s timeout)
    const enriched = await Promise.all(
      formattedTracks.map(async (track) => {
        try {
          const itunesRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(track.artist + ' ' + track.name)}&entity=song&limit=1`,
            { signal: AbortSignal.timeout(2500) }
          );
          if (itunesRes.ok) {
            const itunesData = await itunesRes.json();
            if (itunesData.results && itunesData.results.length > 0) {
              const item = itunesData.results[0];
              if (item.previewUrl) {
                track.preview_url = item.previewUrl;
              }
              if (!track.image_url && item.artworkUrl100) {
                track.image_url = item.artworkUrl100.replace('100x100bb', '400x400bb');
              }
            }
          }
        } catch (e) {
          // Gracefully ignore iTunes timeout
        }
        return track;
      })
    );

    return NextResponse.json({
      success: true,
      tracks: enriched,
      results: {
        trackmatches: {
          track: enriched,
        },
      },
    });
  } catch (error: any) {
    console.error('[Music Search Route Error]', error);

    // Fallback: iTunes direct search if YouTube InnerTube encountered an error
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=6`
      );
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        const itunesTracks = (itunesData.results || []).map((item: any) => ({
          id: String(item.trackId || Math.random()),
          name: item.trackName || cleanQuery,
          title: item.trackName || cleanQuery,
          artist: item.artistName || 'Unknown Artist',
          duration: item.trackTimeMillis
            ? `${Math.floor(item.trackTimeMillis / 60000)}:${String(Math.floor((item.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`
            : '',
          image_url: item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb', '400x400bb')
            : '',
          url:
            item.trackViewUrl ||
            `https://www.youtube.com/results?search_query=${encodeURIComponent(item.artistName + ' ' + item.trackName)}`,
          song_link:
            item.trackViewUrl ||
            `https://www.youtube.com/results?search_query=${encodeURIComponent(item.artistName + ' ' + item.trackName)}`,
          preview_url: item.previewUrl || '',
        }));

        return NextResponse.json({
          success: true,
          tracks: itunesTracks,
          results: {
            trackmatches: {
              track: itunesTracks,
            },
          },
        });
      }
    } catch (e) {}

    return NextResponse.json(
      { success: false, error: 'Failed to search tracks', tracks: [] },
      { status: 500 }
    );
  }
}
