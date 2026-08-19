import { afterAll, describe, expect, it } from 'vitest';
import type {
  AudioQuality,
  CatalogSearchPage,
  Lyrics,
  PlaylistCollections,
  PlaylistDetail,
  StreamInfo,
  Track,
  TrackPage,
  UserProfile,
} from '@siplayer/contracts';
import { buildApp } from '../app';
import { loadConfig } from '../config/env';
import type { AuthProvider, ContentProvider } from '../providers';

const user: UserProfile = { id: 'user-1', nickname: 'Origin', avatarUrl: null };
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
const stream: StreamInfo = { trackId: 'track-1', url: 'https://audio.example.com/track.mp3', requestedQuality: 'auto', actualQuality: 'high' };
const playlists: PlaylistCollections = { created: [], subscribed: [] };

let pollCount = 0;
const provider: ContentProvider = {
  searchTracks: async (): Promise<TrackPage> => ({ items: [track], page: 1, pageSize: 30, hasMore: false }),
  searchCatalog: async (_query, type): Promise<CatalogSearchPage> => ({ type, items: [], page: 1, pageSize: 30, hasMore: false }),
  getTrack: async () => track,
  getLyrics: async (): Promise<Lyrics> => ({ type: 'NONE', lines: [] }),
  getPlaylist: async (): Promise<PlaylistDetail> => ({ id: 'playlist-1', name: 'Focus', tracks: [] }),
  resolveStream: async (id: string, quality: AudioQuality): Promise<StreamInfo> => ({ ...stream, trackId: id, requestedQuality: quality }),
};
const authProvider: AuthProvider = {
  startQr: async () => ({ upstreamKey: 'unikey-secret', qrImageDataUrl: 'data:image/png;base64,qr', expiresAt: new Date(Date.now() + 60_000).toISOString() }),
  checkQr: async () => {
    pollCount += 1;
    return pollCount === 1 ? { status: 'WAITING_SCAN' } : { status: 'AUTHORIZED', cookie: 'MUSIC_U=upstream-secret' };
  },
  getCurrentUser: async () => user,
  getUserPlaylists: async (): Promise<PlaylistCollections> => playlists,
  getRecentTracks: async (): Promise<Track[]> => [track],
  getLikedTracks: async (): Promise<Track[]> => [track],
  setTrackLiked: async (_id: string, liked: boolean): Promise<boolean> => liked,
};

const app = buildApp(loadConfig({ NODE_ENV: 'test' }), { logger: false, provider, authProvider });
afterAll(async () => app.close());

describe('auth routes', () => {
  it('keeps upstream cookie server-side through the QR session flow', async () => {
    const start = await app.inject({ method: 'POST', url: '/v1/auth/qr/start', payload: {} });
    const startBody = start.json<{ data: { challengeId: string; qrImageDataUrl: string } }>();
    expect(start.statusCode).toBe(200);
    expect(startBody.data.qrImageDataUrl).toMatch(/^data:image\//);
    expect(startBody.data.challengeId).not.toContain('unikey-secret');

    const waiting = await app.inject({ method: 'GET', url: `/v1/auth/qr/${startBody.data.challengeId}` });
    expect(waiting.json<{ data: { status: string } }>().data.status).toBe('WAITING_SCAN');

    const authorized = await app.inject({ method: 'GET', url: `/v1/auth/qr/${startBody.data.challengeId}` });
    const authorizedBody = authorized.json<{ data: { status: string; sessionToken: string; user: UserProfile } }>();
    expect(authorizedBody.data.status).toBe('AUTHORIZED');
    expect(authorizedBody.data.sessionToken).not.toContain('upstream-secret');
    expect(authorizedBody.data.user).toEqual(user);

    const me = await app.inject({ method: 'GET', url: '/v1/auth/me', headers: { authorization: `Bearer ${authorizedBody.data.sessionToken}` } });
    expect(me.statusCode).toBe(200);
    expect(me.json<{ data: UserProfile }>().data).toEqual(user);

    const liked = await app.inject({ method: 'GET', url: '/v1/me/liked-tracks', headers: { authorization: `Bearer ${authorizedBody.data.sessionToken}` } });
    expect(liked.statusCode).toBe(200);
    expect(liked.json<{ data: { items: Track[] } }>().data.items[0]?.id).toBe('track-1');

    const logout = await app.inject({ method: 'POST', url: '/v1/auth/logout', headers: { authorization: `Bearer ${authorizedBody.data.sessionToken}` } });
    expect(logout.json<{ data: { ok: boolean } }>().data.ok).toBe(true);
    const expired = await app.inject({ method: 'GET', url: '/v1/auth/me', headers: { authorization: `Bearer ${authorizedBody.data.sessionToken}` } });
    expect(expired.statusCode).toBe(401);
  });

  it('requires auth for cloud library endpoints', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/me/playlists' });
    expect(response.statusCode).toBe(401);
    expect(response.json<{ error: { code: string } }>().error.code).toBe('AUTH_REQUIRED');
  });
});
