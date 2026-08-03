import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const apiKey = process.env.LAST_FM_API_KEY;
  if (!apiKey) {
    console.error('LAST_FM_API_KEY is not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${apiKey}&format=json&limit=5`);
    const data = await res.json();
    
    // If tracks are found, enrich them with a 30-sec preview from iTunes API
    if (data?.results?.trackmatches?.track) {
      const tracks = data.results.trackmatches.track;
      
      const enrichedTracks = await Promise.all(tracks.map(async (track: any) => {
        try {
          const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(track.artist + ' ' + track.name)}&entity=song&limit=1`);
          if (itunesRes.ok) {
            const itunesData = await itunesRes.json();
            if (itunesData.results && itunesData.results.length > 0) {
              const item = itunesData.results[0];
              track.preview_url = item.previewUrl;
              if (item.artworkUrl100) {
                track.image_url = item.artworkUrl100.replace('100x100bb', '300x300bb');
              }
            }
          }
        } catch (e) {
          console.error('iTunes API preview fetch failed:', e);
        }
        return track;
      }));
      
      data.results.trackmatches.track = enrichedTracks;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Last.fm API:', error);
    return NextResponse.json({ error: 'Failed to fetch music data' }, { status: 500 });
  }
}
