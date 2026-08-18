import type { Lyrics, PlaylistDetail, Track, TrackPage } from '@siplayer/contracts';
import { NeteaseApiClient } from './client';
import { neteaseEndpoints } from './endpoints';
import { NeteaseProviderError } from './errors';
import {
  mapDetailTrack,
  mapLyrics,
  mapPlaylist,
  mapSearchResponse,
} from './mapper';
import {
  RawLyricsResponseSchema,
  RawPlaylistDetailResponseSchema,
  RawPlaylistTracksResponseSchema,
  RawSearchResponseSchema,
  RawTrackDetailResponseSchema,
} from './rawTypes';

export interface ContentProvider {
  searchTracks: (keyword: string, page: number, pageSize: number) => Promise<TrackPage>;
  getTrack: (id: string) => Promise<Track>;
  getLyrics: (id: string) => Promise<Lyrics>;
  getPlaylist: (id: string) => Promise<PlaylistDetail>;
}

export class NeteaseProvider implements ContentProvider {
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
}

export * from './client';
export * from './endpoints';
export * from './errors';
export * from './mapper';
export * from './rawTypes';
