import { afterAll, describe, expect, it } from 'vitest';
import type { AudioQuality, CatalogSearchPage, Lyrics, PlaylistDetail, StreamInfo, Track, TrackPage } from '@siplayer/contracts';
import { buildApp } from '../app';
import { NeteaseProviderError, type ContentProvider } from '../providers';
import { loadConfig } from '../config/env';

const track: Track = {
  id: 'track-1',
  name: 'Quiet Morning',
  artists: [{ id: 'artist-1', name: 'Origin' }],
  artistText: 'Origin',
  album: null,
  artworkUrl: null,
  durationMs: 180000,
  playable: true,
};

const provider: ContentProvider = {
  searchTracks: async (): Promise<TrackPage> => ({ items: [track], page: 1, pageSize: 30, hasMore: false }),
  searchCatalog: async (_query, type): Promise<CatalogSearchPage> => ({ type, items: [], page: 1, pageSize: 30, hasMore: false }),
  getTrack: async () => track,
  getLyrics: async (): Promise<Lyrics> => ({ type: 'NONE', lines: [] }),
  getPlaylist: async (): Promise<PlaylistDetail> => ({ id: 'playlist-1', name: 'Focus', tracks: [] }),
  resolveStream: async (id: string, quality: AudioQuality): Promise<StreamInfo> => ({
    trackId: id,
    url: 'https://audio.example.com/track.mp3',
    requestedQuality: quality,
    actualQuality: 'high',
  }),
};

const app = buildApp(loadConfig({ NODE_ENV: 'test' }), { logger: false, provider });

afterAll(async () => {
  await app.close();
});

describe('content routes', () => {
  it('validates search input and returns normalized tracks', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/search?q=quiet' });
    const body = response.json<{ data: TrackPage; requestId: string }>();

    expect(response.statusCode).toBe(200);
    expect(body.data.items[0]?.artistText).toBe('Origin');
    expect(body.requestId).toMatch(/^req_/);
  });

  it('supports normalized catalog search types', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/search?q=quiet&type=album' });
    const body = response.json<{ data: CatalogSearchPage }>();

    expect(response.statusCode).toBe(200);
    expect(body.data.type).toBe('album');
    expect(body.data.items).toEqual([]);
  });

  it('does not accept arbitrary upstream parameters', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/search?proxy=http://internal.example' });
    const body = response.json<{ error: { code: string } }>();

    expect(response.statusCode).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('resolves a temporary stream URL through the stable contract', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/tracks/track-1/stream?quality=high' });
    const body = response.json<{ data: StreamInfo; requestId: string }>();

    expect(response.statusCode).toBe(200);
    expect(body.data).toMatchObject({ trackId: 'track-1', requestedQuality: 'high', actualQuality: 'high' });
    expect(body.requestId).toMatch(/^req_/);
  });

  it('maps provider timeout to the stable error model', async () => {
    const timeoutApp = buildApp(loadConfig({ NODE_ENV: 'test' }), {
      logger: false,
      provider: {
        ...provider,
        searchTracks: async () => {
          throw new NeteaseProviderError('UPSTREAM_TIMEOUT', 'Music service took too long to respond.', true);
        },
      },
    });
    const response = await timeoutApp.inject({ method: 'GET', url: '/v1/search?q=quiet' });
    const body = response.json<{ error: { code: string; retryable: boolean }; requestId: string }>();
    await timeoutApp.close();

    expect(response.statusCode).toBe(504);
    expect(body.error).toEqual({ code: 'UPSTREAM_TIMEOUT', message: 'Music service took too long to respond.', retryable: true });
    expect(body.requestId).toMatch(/^req_/);
  });
});
