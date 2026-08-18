import type { AudioQuality, Lyrics, PlaylistCollections, PlaylistDetail, PlaylistSummary, StreamInfo, Track, TrackPage, UserProfile } from '@siplayer/contracts';
import { NeteaseApiClient } from './client';
import { neteaseEndpoints } from './endpoints';
import { NeteaseProviderError } from './errors';
import {
  RawLoginStatusResponseSchema,
  RawLikeResponseSchema,
  RawQrCheckResponseSchema,
  RawQrCreateResponseSchema,
  RawQrKeyResponseSchema,
  RawRecentTracksResponseSchema,
  RawUserPlaylistResponseSchema,
} from './authRawTypes';
import { mapPlaylistSummary, mapRecentTracks, mapUserProfile } from './authMapper';
import {
  mapDetailTrack,
  mapLyrics,
  mapPlaylist,
  mapSearchResponse,
  mapStream,
} from './mapper';
import {
  RawLyricsResponseSchema,
  RawPlaylistDetailResponseSchema,
  RawPlaylistTracksResponseSchema,
  RawSearchResponseSchema,
  RawStreamResponseSchema,
  RawTrackDetailResponseSchema,
} from './rawTypes';

export interface ContentProvider {
  searchTracks: (keyword: string, page: number, pageSize: number) => Promise<TrackPage>;
  getTrack: (id: string) => Promise<Track>;
  getLyrics: (id: string) => Promise<Lyrics>;
  getPlaylist: (id: string) => Promise<PlaylistDetail>;
  resolveStream: (id: string, quality: AudioQuality) => Promise<StreamInfo>;
}

export interface AuthProvider {
  startQr: () => Promise<{ upstreamKey: string; qrImageDataUrl: string; expiresAt: string }>;
  checkQr: (upstreamKey: string) => Promise<{ status: 'WAITING_SCAN' | 'WAITING_CONFIRM' | 'AUTHORIZED' | 'EXPIRED'; cookie?: string }>;
  getCurrentUser: (cookie: string) => Promise<UserProfile>;
  getUserPlaylists: (userId: string, cookie: string) => Promise<PlaylistCollections>;
  getRecentTracks: (userId: string, cookie: string) => Promise<Track[]>;
  setTrackLiked: (trackId: string, liked: boolean, cookie: string) => Promise<boolean>;
}

export class NeteaseProvider implements ContentProvider, AuthProvider {
  private readonly client: NeteaseApiClient;

  constructor(options: ConstructorParameters<typeof NeteaseApiClient>[0]) {
    this.client = new NeteaseApiClient(options);
  }

  async searchTracks(keyword: string, page: number, pageSize: number): Promise<TrackPage> {
    const raw = await this.client.get(
      neteaseEndpoints.search,
      { keywords: keyword, type: 1, limit: pageSize, offset: (page - 1) * pageSize },
      (payload) => RawSearchResponseSchema.parse(payload),
    );
    return mapSearchResponse(raw, page, pageSize);
  }

  async getTrack(id: string): Promise<Track> {
    const raw = await this.client.get(
      neteaseEndpoints.trackDetail,
      { ids: id },
      (payload) => RawTrackDetailResponseSchema.parse(payload),
    );
    const song = raw.songs[0];
    if (!song) throw new NeteaseProviderError('NOT_FOUND', 'The requested track was not found.', false, 404);
    return mapDetailTrack(song, raw.privileges[0]);
  }

  async getLyrics(id: string): Promise<Lyrics> {
    const raw = await this.client.get(
      neteaseEndpoints.lyrics,
      { id },
      (payload) => RawLyricsResponseSchema.parse(payload),
    );
    return mapLyrics(raw);
  }

  async getPlaylist(id: string): Promise<PlaylistDetail> {
    const raw = await this.client.get(
      neteaseEndpoints.playlistDetail,
      { id },
      (payload) => RawPlaylistDetailResponseSchema.parse(payload),
    );
    let songs = raw.playlist.tracks;
    const expectedCount = Math.min(raw.playlist.trackCount ?? raw.playlist.trackIds.length, 500);
    if (songs.length < expectedCount && raw.playlist.trackIds.length > 0) {
      const all = await this.client.get(
        neteaseEndpoints.playlistTracks,
        { id, limit: expectedCount, offset: 0 },
        (payload) => RawPlaylistTracksResponseSchema.parse(payload),
      );
      songs = all.songs;
    }
    const tracks = songs.map((song) => mapDetailTrack(song, song.privilege));
    return mapPlaylist(raw.playlist, tracks);
  }

  async resolveStream(id: string, quality: AudioQuality): Promise<StreamInfo> {
    const level = {
      auto: 'exhigh',
      standard: 'standard',
      high: 'higher',
      lossless: 'lossless',
      hi_res: 'hires',
    }[quality];
    const raw = await this.client.get(
      neteaseEndpoints.stream,
      { id, level },
      (payload) => RawStreamResponseSchema.parse(payload),
    );
    const stream = mapStream(raw, id, quality);
    if (!stream) {
      throw new NeteaseProviderError('TRACK_UNAVAILABLE', 'This track is currently unavailable.', false, 422);
    }
    return stream;
  }

  async startQr(): Promise<{ upstreamKey: string; qrImageDataUrl: string; expiresAt: string }> {
    const timestamp = Date.now();
    const keyResponse = await this.client.get(
      neteaseEndpoints.qrKey,
      { timestamp },
      (payload) => RawQrKeyResponseSchema.parse(payload),
    );
    const createResponse = await this.client.get(
      neteaseEndpoints.qrCreate,
      { key: keyResponse.data.unikey, qrimg: true, timestamp },
      (payload) => RawQrCreateResponseSchema.parse(payload),
    );
    const image = createResponse.data.qrimg;
    if (!image) throw new NeteaseProviderError('UPSTREAM_UNAVAILABLE', 'Login QR could not be generated.', true);
    const qrImageDataUrl = image.startsWith('data:image/')
      ? image
      : image.startsWith('base64,')
        ? `data:image/png;${image}`
        : `data:image/png;base64,${image}`;
    return {
      upstreamKey: keyResponse.data.unikey,
      qrImageDataUrl,
      expiresAt: new Date(Date.now() + 3 * 60_000).toISOString(),
    };
  }

  async checkQr(upstreamKey: string): Promise<{ status: 'WAITING_SCAN' | 'WAITING_CONFIRM' | 'AUTHORIZED' | 'EXPIRED'; cookie?: string }> {
    const raw = await this.client.get(
      neteaseEndpoints.qrCheck,
      { key: upstreamKey, timestamp: Date.now() },
      (payload) => RawQrCheckResponseSchema.parse(payload),
    );
    switch (raw.code) {
      case 801:
        return { status: 'WAITING_SCAN' };
      case 802:
        return { status: 'WAITING_CONFIRM' };
      case 803:
        if (!raw.cookie) throw new NeteaseProviderError('UPSTREAM_UNAVAILABLE', 'Login completed without a session.', true);
        return { status: 'AUTHORIZED', cookie: raw.cookie };
      case 800:
        return { status: 'EXPIRED' };
      default:
        throw new NeteaseProviderError('UPSTREAM_UNAVAILABLE', 'Login status could not be checked.', true);
    }
  }

  async getCurrentUser(cookie: string): Promise<UserProfile> {
    const raw = await this.client.get(
      neteaseEndpoints.loginStatus,
      { timestamp: Date.now() },
      (payload) => RawLoginStatusResponseSchema.parse(payload),
      cookie,
    );
    const user = mapUserProfile(raw);
    if (!user) throw new NeteaseProviderError('AUTH_REQUIRED', 'The upstream session is not authorized.', false, 401);
    return user;
  }

  async getUserPlaylists(userId: string, cookie: string): Promise<PlaylistCollections> {
    const raw = await this.client.get(
      neteaseEndpoints.userPlaylist,
      { uid: userId, limit: 100, offset: 0 },
      (payload) => RawUserPlaylistResponseSchema.parse(payload),
      cookie,
    );
    const created: PlaylistSummary[] = [];
    const subscribed: PlaylistSummary[] = [];
    for (const playlist of raw.playlist.map(mapPlaylistSummary)) {
      if (playlist.creator?.id === userId) created.push(playlist);
      else subscribed.push(playlist);
    }
    return { created, subscribed };
  }

  async getRecentTracks(userId: string, cookie: string): Promise<Track[]> {
    const raw = await this.client.get(
      neteaseEndpoints.userRecord,
      { uid: userId, type: 0 },
      (payload) => RawRecentTracksResponseSchema.parse(payload),
      cookie,
    );
    return mapRecentTracks(raw);
  }

  async setTrackLiked(trackId: string, liked: boolean, cookie: string): Promise<boolean> {
    const raw = await this.client.get(
      neteaseEndpoints.like,
      { id: trackId, like: liked },
      (payload) => RawLikeResponseSchema.parse(payload),
      cookie,
    );
    if (raw.code !== 200) throw new NeteaseProviderError('UPSTREAM_UNAVAILABLE', 'The track could not be updated.', true);
    return liked;
  }
}

export * from './authMapper';
export * from './authRawTypes';
export * from './client';
export * from './endpoints';
export * from './errors';
export * from './mapper';
export * from './rawTypes';
