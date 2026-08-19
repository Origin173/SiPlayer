import type { AlbumDetail, ArtistAlbumPage, ArtistDetail, AudioQuality, CatalogSearchPage, Lyrics, PlaylistCollections, PlaylistDetail, PlaylistSummary, StreamInfo, Track, TrackPage, UserProfile } from '@siplayer/contracts';
import { NeteaseApiClient } from './client.js';
import { neteaseEndpoints } from './endpoints.js';
import { NeteaseProviderError } from './errors.js';
import { chunkArray, orderByIds } from './batching.js';
import {
  RawLikeListResponseSchema,
  RawLoginStatusResponseSchema,
  RawLikeResponseSchema,
  RawQrCheckResponseSchema,
  RawQrCreateResponseSchema,
  RawQrKeyResponseSchema,
  RawRecentTracksResponseSchema,
  RawUserPlaylistResponseSchema,
} from './authRawTypes.js';
import { mapPlaylistSummary, mapRecentTracks, mapUserProfile } from './authMapper.js';
import {
  mapCatalogSearchResponse,
  mapAlbumDetail,
  mapArtistAlbumPage,
  mapArtistDetail,
  mapDetailTrack,
  mapLyrics,
  mapPlaylist,
  mapSearchResponse,
  mapStream,
} from './mapper.js';
import {
  type RawPrivilege,
  type RawSong,
  RawLyricsResponseSchema,
  RawAlbumDetailResponseSchema,
  RawArtistAlbumResponseSchema,
  RawArtistDetailResponseSchema,
  RawPlaylistDetailResponseSchema,
  RawPlaylistTracksResponseSchema,
  RawSearchResponseSchema,
  RawStreamResponseSchema,
  RawTrackDetailResponseSchema,
} from './rawTypes.js';

export interface ContentProvider {
  searchTracks: (keyword: string, page: number, pageSize: number) => Promise<TrackPage>;
  searchCatalog: (keyword: string, type: 'album' | 'artist' | 'playlist', page: number, pageSize: number) => Promise<CatalogSearchPage>;
  getTrack: (id: string) => Promise<Track>;
  getAlbum: (id: string) => Promise<AlbumDetail>;
  getArtist: (id: string) => Promise<ArtistDetail>;
  getArtistTopTracks: (id: string) => Promise<Track[]>;
  getArtistAlbums: (id: string, page: number, pageSize: number) => Promise<ArtistAlbumPage>;
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
  getLikedTracks: (userId: string, cookie: string) => Promise<Track[]>;
  setTrackLiked: (trackId: string, liked: boolean, cookie: string) => Promise<boolean>;
}

export class NeteaseProvider implements ContentProvider, AuthProvider {
  private readonly client: NeteaseApiClient;
  private static readonly maxPlaylistTracks = 500;
  private static readonly detailBatchSize = 100;

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

  async searchCatalog(keyword: string, type: 'album' | 'artist' | 'playlist', page: number, pageSize: number): Promise<CatalogSearchPage> {
    const upstreamType = { album: 10, artist: 100, playlist: 1000 }[type];
    const raw = await this.client.get(
      neteaseEndpoints.search,
      { keywords: keyword, type: upstreamType, limit: pageSize, offset: (page - 1) * pageSize },
      (payload) => RawSearchResponseSchema.parse(payload),
    );
    return mapCatalogSearchResponse(raw, type, page, pageSize);
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

  async getAlbum(id: string): Promise<AlbumDetail> {
    const raw = await this.client.get(
      neteaseEndpoints.albumDetail,
      { id },
      (payload) => RawAlbumDetailResponseSchema.parse(payload),
    );
    return mapAlbumDetail(raw);
  }

  async getArtist(id: string): Promise<ArtistDetail> {
    const raw = await this.client.get(
      neteaseEndpoints.artistDetail,
      { id },
      (payload) => RawArtistDetailResponseSchema.parse(payload),
    );
    return mapArtistDetail(raw, id);
  }

  async getArtistTopTracks(id: string): Promise<Track[]> {
    const raw = await this.client.get(
      neteaseEndpoints.artistTopTracks,
      { id },
      (payload) => RawTrackDetailResponseSchema.parse(payload),
    );
    return raw.songs.map((song) => mapDetailTrack(song, raw.privileges.find((privilege) => privilege.id === song.id) ?? song.privilege));
  }

  async getArtistAlbums(id: string, page: number, pageSize: number): Promise<ArtistAlbumPage> {
    const raw = await this.client.get(
      neteaseEndpoints.artistAlbums,
      { id, limit: pageSize, offset: (page - 1) * pageSize },
      (payload) => RawArtistAlbumResponseSchema.parse(payload),
    );
    return mapArtistAlbumPage(raw, page, pageSize);
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
    const expectedCount = Math.min(raw.playlist.trackCount ?? raw.playlist.trackIds.length, NeteaseProvider.maxPlaylistTracks);
    const expectedIds = raw.playlist.trackIds.slice(0, expectedCount).map((track) => track.id);
    const songsById = new Map(raw.playlist.tracks.map((song) => [song.id, song]));
    if (expectedIds.length > songsById.size) {
      for (const [offset, batch] of chunkArray(expectedIds, NeteaseProvider.detailBatchSize).entries()) {
        const all = await this.client.get(
          neteaseEndpoints.playlistTracks,
          { id, limit: batch.length, offset: offset * NeteaseProvider.detailBatchSize },
          (payload) => RawPlaylistTracksResponseSchema.parse(payload),
        );
        for (const song of all.songs) songsById.set(song.id, song);
      }
    }
    const songs = expectedIds.length > 0
      ? orderByIds(expectedIds, [...songsById.values()])
      : expectedCount > 0 ? raw.playlist.tracks.slice(0, expectedCount) : raw.playlist.tracks;
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
      undefined,
      [800, 801, 802, 803],
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

  async getLikedTracks(userId: string, cookie: string): Promise<Track[]> {
    const idsResponse = await this.client.get(
      neteaseEndpoints.likeList,
      { uid: userId },
      (payload) => RawLikeListResponseSchema.parse(payload),
      cookie,
    );
    if (idsResponse.ids.length === 0) return [];
    const songsById = new Map<string, { song: RawSong; privilege?: RawPrivilege }>();
    for (const ids of chunkArray(idsResponse.ids, NeteaseProvider.detailBatchSize)) {
      const detail = await this.client.get(
        neteaseEndpoints.trackDetail,
        { ids: ids.join(',') },
        (payload) => RawTrackDetailResponseSchema.parse(payload),
        cookie,
      );
      const privileges = new Map(detail.privileges.map((privilege) => [privilege.id, privilege]));
      for (const song of detail.songs) songsById.set(song.id, { song, privilege: privileges.get(song.id) });
    }
    return idsResponse.ids.flatMap((id) => {
      const item = songsById.get(id);
      return item ? [mapDetailTrack(item.song, item.privilege)] : [];
    });
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

export * from './authMapper.js';
export * from './authRawTypes.js';
export * from './client.js';
export * from './endpoints.js';
export * from './errors.js';
export * from './mapper.js';
export * from './rawTypes.js';
