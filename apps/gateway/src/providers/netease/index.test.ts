import { describe, expect, it, vi } from 'vitest';
import type { AudioQuality } from '@siplayer/contracts';
import { NeteaseProvider } from './index.js';

describe('NeteaseProvider stream quality mapping', () => {
  it.each([
    ['standard', 'standard'],
    ['high', 'exhigh'],
    ['lossless', 'lossless'],
    ['hi_res', 'hires'],
  ] as const)('maps %s to the api-enhanced level %s', async (quality: AudioQuality, expectedLevel: string) => {
    let requestedUrl: URL | undefined;
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      requestedUrl = new URL(String(input));
      return new Response(JSON.stringify({
        code: 200,
        data: [{ id: 'track-1', url: 'https://audio.example.com/track.mp3', br: 320_000 }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    const provider = new NeteaseProvider({ baseUrl: 'https://upstream.example', fetchImpl });

    await provider.resolveStream('track-1', quality);

    expect(requestedUrl?.pathname).toBe('/song/url/v1');
    expect(requestedUrl?.searchParams.get('level')).toBe(expectedLevel);
  });

  it('loads all tracks from a playlist larger than 500 items', async () => {
    const trackIds = Array.from({ length: 750 }, (_, index) => String(index + 1));
    const requestedUrls: URL[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      requestedUrls.push(url);
      if (url.pathname === '/playlist/detail') {
        return new Response(JSON.stringify({
          code: 200,
          playlist: {
            id: 'playlist-1',
            name: 'Large playlist',
            trackCount: 750,
            trackIds: trackIds.map((id) => ({ id })),
            tracks: [],
          },
        }), { status: 200 });
      }

      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 100);
      return new Response(JSON.stringify({
        code: 200,
        songs: trackIds.slice(offset, offset + limit).map((id) => ({ id, name: `Track ${id}` })),
      }), { status: 200 });
    }) as unknown as typeof fetch;
    const provider = new NeteaseProvider({ baseUrl: 'https://upstream.example', fetchImpl });

    const playlist = await provider.getPlaylist('playlist-1');

    expect(playlist.tracks).toHaveLength(750);
    expect(requestedUrls.filter((url) => url.pathname === '/playlist/track/all')).toHaveLength(8);
  });

  it('loads all user playlists across upstream pages', async () => {
    const requestedUrls: URL[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      requestedUrls.push(url);
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const count = offset === 0 ? 100 : 50;
      const more = offset === 0;
      return new Response(JSON.stringify({
        code: 200,
        more,
        playlist: Array.from({ length: count }, (_, index) => ({
          id: String(offset + index + 1),
          name: `Playlist ${offset + index + 1}`,
          creator: { userId: 'user-1', nickname: 'Origin' },
        })),
      }), { status: 200 });
    }) as unknown as typeof fetch;
    const provider = new NeteaseProvider({ baseUrl: 'https://upstream.example', fetchImpl });

    const playlists = await provider.getUserPlaylists('user-1', 'cookie');

    expect(playlists.created).toHaveLength(150);
    expect(playlists.subscribed).toHaveLength(0);
    expect(requestedUrls.filter((url) => url.pathname === '/user/playlist')).toHaveLength(2);
    expect(requestedUrls.map((url) => url.searchParams.get('offset'))).toEqual(['0', '100']);
  });

});
