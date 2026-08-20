import { afterAll, describe, expect, it, vi } from 'vitest';
import type { AlbumDetail, ArtistAlbumPage, ArtistDetail, AudioQuality, CatalogSearchPage, Lyrics, PlaylistDetail, StreamInfo, Track, TrackPage } from '@siplayer/contracts';
import { buildApp } from '../app.js';
import { NeteaseProviderError, type ContentProvider } from '../providers/index.js';
import { loadConfig } from '../config/env.js';

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

const album: AlbumDetail = {
  id: 'album-1',
  name: 'Quiet Album',
  artworkUrl: null,
  artists: [{ id: 'artist-1', name: 'Origin' }],
  tracks: [track],
};

const artist: ArtistDetail = { id: 'artist-1', name: 'Origin', description: null };
const artistAlbums: ArtistAlbumPage = { items: [], page: 1, pageSize: 30, hasMore: false };

const provider: ContentProvider = {
  searchTracks: async (): Promise<TrackPage> => ({ items: [track], page: 1, pageSize: 30, hasMore: false }),
  searchCatalog: async (_query, type): Promise<CatalogSearchPage> => ({ type, items: [], page: 1, pageSize: 30, hasMore: false }),
  getTrack: async () => track,
  getAlbum: async () => album,
  getArtist: async () => artist,
  getArtistTopTracks: async () => [track],
  getArtistAlbums: async (): Promise<ArtistAlbumPage> => artistAlbums,
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

  it('caches public content responses but never caches temporary stream URLs', async () => {
    const searchTracks = vi.fn(provider.searchTracks);
    const resolveStream = vi.fn(provider.resolveStream);
    const cacheApp = buildApp(loadConfig({ NODE_ENV: 'test' }), {
      logger: false,
      provider: { ...provider, searchTracks, resolveStream },
    });

    const firstSearch = await cacheApp.inject({ method: 'GET', url: '/v1/search?q=cache-test' });
    const secondSearch = await cacheApp.inject({ method: 'GET', url: '/v1/search?q=cache-test' });
    const firstStream = await cacheApp.inject({ method: 'GET', url: '/v1/tracks/stream-test/stream?quality=high' });
    const secondStream = await cacheApp.inject({ method: 'GET', url: '/v1/tracks/stream-test/stream?quality=high' });

    expect(firstSearch.statusCode).toBe(200);
    expect(secondSearch.statusCode).toBe(200);
    expect(firstSearch.json<{ requestId: string }>().requestId).not.toBe(secondSearch.json<{ requestId: string }>().requestId);
    expect(searchTracks).toHaveBeenCalledTimes(1);

    const canonicalSearch = await cacheApp.inject({ method: 'GET', url: '/v1/search?q=canonical&type=track' });
    const reorderedCanonicalSearch = await cacheApp.inject({ method: 'GET', url: '/v1/search?type=track&q=canonical' });
    expect(canonicalSearch.statusCode).toBe(200);
    expect(reorderedCanonicalSearch.statusCode).toBe(200);
    expect(searchTracks).toHaveBeenCalledTimes(2);
    expect(canonicalSearch.json<{ requestId: string }>().requestId).not.toBe(reorderedCanonicalSearch.json<{ requestId: string }>().requestId);
    expect(firstStream.statusCode).toBe(200);
    expect(secondStream.statusCode).toBe(200);
    expect(resolveStream).toHaveBeenCalledTimes(2);
    await cacheApp.close();
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

  it('serves normalized album and artist detail resources', async () => {
    const albumResponse = await app.inject({ method: 'GET', url: '/v1/albums/album-1' });
    const artistResponse = await app.inject({ method: 'GET', url: '/v1/artists/artist-1' });
    const topTracksResponse = await app.inject({ method: 'GET', url: '/v1/artists/artist-1/top-tracks' });
    const albumsResponse = await app.inject({ method: 'GET', url: '/v1/artists/artist-1/albums' });

    expect(albumResponse.statusCode).toBe(200);
    expect(albumResponse.json<{ data: AlbumDetail }>().data.tracks[0]?.id).toBe('track-1');
    expect(artistResponse.statusCode).toBe(200);
    expect(artistResponse.json<{ data: ArtistDetail }>().data.name).toBe('Origin');
    expect(topTracksResponse.statusCode).toBe(200);
    expect(topTracksResponse.json<{ data: Track[] }>().data[0]?.artistText).toBe('Origin');
    expect(albumsResponse.statusCode).toBe(200);
    expect(albumsResponse.json<{ data: ArtistAlbumPage }>().data.page).toBe(1);
  });

  it('rejects provider payloads that violate the stable contract', async () => {
    const invalidApp = buildApp(loadConfig({ NODE_ENV: 'test' }), {
      logger: false,
      provider: { ...provider, getTrack: async () => ({ ...track, id: '' }) },
    });
    const response = await invalidApp.inject({ method: 'GET', url: '/v1/tracks/track-1' });
    const body = response.json<{ error: { code: string; retryable: boolean } }>();
    await invalidApp.close();

    expect(response.statusCode).toBe(502);
    expect(body.error).toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', retryable: true });
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

  it('returns the contract rate-limit status for an upstream 429', async () => {
    const limitedApp = buildApp(loadConfig({ NODE_ENV: 'test' }), {
      logger: false,
      provider: {
        ...provider,
        searchTracks: async () => {
          throw new NeteaseProviderError('RATE_LIMITED', 'Music service rate limit exceeded.', true, 429);
        },
      },
    });
    const response = await limitedApp.inject({ method: 'GET', url: '/v1/search?q=test' });
    const body = response.json<{ error: { code: string; retryable: boolean } }>();
    await limitedApp.close();

    expect(response.statusCode).toBe(429);
    expect(response.headers['retry-after']).toBe('60');
    expect(body.error).toMatchObject({ code: 'RATE_LIMITED', retryable: true });
  });

  it('maps an expired upstream session to a stable unauthorized response', async () => {
    const expiredApp = buildApp(loadConfig({ NODE_ENV: 'test' }), {
      logger: false,
      provider: {
        ...provider,
        getTrack: async () => {
          throw new NeteaseProviderError('AUTH_EXPIRED', 'The upstream login session has expired.', false, 401);
        },
      },
    });
    const response = await expiredApp.inject({ method: 'GET', url: '/v1/tracks/track-1' });
    const body = response.json<{ error: { code: string; retryable: boolean } }>();
    await expiredApp.close();

    expect(response.statusCode).toBe(401);
    expect(body.error).toEqual({ code: 'AUTH_EXPIRED', message: 'The upstream login session has expired.', retryable: false });
  });

  it('maps a required upstream session to HTTP 401', async () => {
    const requiredApp = buildApp(loadConfig({ NODE_ENV: 'test' }), {
      logger: false,
      provider: {
        ...provider,
        getTrack: async () => {
          throw new NeteaseProviderError('AUTH_REQUIRED', 'Login is required.', false, 401);
        },
      },
    });
    const response = await requiredApp.inject({ method: 'GET', url: '/v1/tracks/track-1' });
    const body = response.json<{ error: { code: string; retryable: boolean } }>();
    await requiredApp.close();

    expect(response.statusCode).toBe(401);
    expect(body.error).toEqual({ code: 'AUTH_REQUIRED', message: 'Login is required.', retryable: false });
  });

});
