import { RawArtistSchema } from './rawTypes.js';
import type {
  AlbumDetail,
  AlbumSummary,
  ArtistAlbumPage,
  ArtistDetail,
  ArtistSummary,
  AudioQuality,
  CatalogSearchPage,
  Lyrics,
  PlaylistDetail,
  PlaylistSummary,
  StreamInfo,
  Track,
  TrackPage,
} from '@siplayer/contracts';
import type {
  RawAlbum,
  RawAlbumDetailResponse,
  RawArtistDetailResponse,
  RawArtistAlbumResponse,
  RawArtist,
  RawLyricsResponse,
  RawPlaylist,
  RawPrivilege,
  RawSearchPlaylist,
  RawSearchResponse,
  RawSong,
  RawStreamResponse,
} from './rawTypes.js';

export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

export function mapArtist(raw: RawArtist): ArtistSummary {
  return {
    id: raw.id,
    name: raw.name?.trim() || '未知艺术家',
    avatarUrl: safeUrl(raw.avatarUrl ?? raw.picUrl),
  };
}

export function mapAlbum(raw: RawAlbum | null | undefined): AlbumSummary | null {
  if (!raw) return null;
  const artists = (raw.artists ?? (raw.artist ? [raw.artist] : [])).map(mapArtist);
  return {
    id: raw.id,
    name: raw.name?.trim() || '未知专辑',
    artworkUrl: safeUrl(raw.picUrl ?? raw.pic_str),
    artists,
    publishDate: raw.publishTime ? new Date(raw.publishTime).toISOString() : null,
  };
}

export function mapAlbumDetail(raw: RawAlbumDetailResponse): AlbumDetail {
  const album = mapAlbum(raw.album);
  if (!album) throw new Error('Album detail did not contain an album.');
  return {
    ...album,
    description: raw.album.description ?? null,
    tracks: raw.songs.map((song) => mapDetailTrack(song, song.privilege)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function findArtist(value: unknown): RawArtist | null {
  const parsed = RawArtistSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  if (!isRecord(value)) return null;
  for (const key of ['artist', 'profile', 'data']) {
    const candidate = findArtist(value[key]);
    if (candidate) return candidate;
  }
  return null;
}

function firstString(value: unknown, keys: string[]): string | null {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

export function mapArtistDetail(raw: RawArtistDetailResponse, id: string): ArtistDetail {
  const artist = raw.artist ?? findArtist(raw.data);
  const summary = mapArtist(artist ?? { id, name: '未知艺术家' });
  return {
    ...summary,
    description: firstString(raw, ['desc', 'briefDesc']) ?? firstString(raw.data, ['desc', 'briefDesc', 'description']),
  };
}

export function mapArtistAlbumPage(raw: RawArtistAlbumResponse, page: number, pageSize: number): ArtistAlbumPage {
  const items = (raw.hotAlbums.length > 0 ? raw.hotAlbums : raw.albums).map((album) => mapAlbum(album)).filter((album): album is AlbumSummary => Boolean(album));
  const total = raw.total ?? raw.albumCount ?? page * pageSize + items.length;
  return {
    items,
    page,
    pageSize,
    hasMore: raw.more ?? page * pageSize < total,
  };
}

function unavailableReason(privilege?: RawPrivilege): Track['availability'] {
  if (!privilege) return undefined;
  if (privilege.st === -200) {
    return { reason: 'REMOVED', message: '歌曲已下架' };
  }
  if (privilege.pl === 0) {
    return { reason: 'PRIVILEGE_REQUIRED', message: '当前账号暂无播放权限' };
  }
  return undefined;
}

export function mapTrack(raw: RawSong, privilege?: RawPrivilege): Track {
  const artists = (raw.ar.length > 0 ? raw.ar : raw.artists ?? []).map(mapArtist);
  const album = mapAlbum(raw.al ?? raw.album);
  const availability = unavailableReason(privilege ?? raw.privilege);
  const durationMs = raw.dt ?? raw.duration ?? null;

  return {
    id: raw.id,
    name: raw.name.trim() || '未命名歌曲',
    artists,
    artistText: artists.map((artist) => artist.name).join(' / ') || '未知艺术家',
    album,
    artworkUrl: album?.artworkUrl ?? null,
    durationMs,
    playable: !availability,
    ...(availability ? { availability } : {}),
  };
}

export function mapSearchResponse(raw: RawSearchResponse, page: number, pageSize: number): TrackPage {
  const songs = raw.result?.songs ?? [];
  const total = raw.result?.songCount ?? page * pageSize + songs.length;
  return {
    items: songs.map((song) => mapTrack(song, song.privilege)),
    page,
    pageSize,
    hasMore: raw.result?.more ?? page * pageSize < total,
  };
}

function mapSearchPlaylist(raw: RawSearchPlaylist): PlaylistSummary {
  return {
    id: raw.id,
    name: raw.name.trim() || '未命名歌单',
    artworkUrl: safeUrl(raw.coverImgUrl ?? raw.picUrl),
    creator: raw.creator
      ? { id: raw.creator.userId, name: raw.creator.nickname || '未知用户', avatarUrl: safeUrl(raw.creator.avatarUrl) }
      : null,
    trackCount: raw.trackCount ?? null,
    description: raw.description ?? null,
  };
}

export function mapCatalogSearchResponse(
  raw: RawSearchResponse,
  type: 'album' | 'artist' | 'playlist',
  page: number,
  pageSize: number,
): CatalogSearchPage {
  const result = raw.result;
  const items = type === 'album'
    ? result?.albums.map((album) => mapAlbum(album)).filter((album): album is AlbumSummary => Boolean(album)) ?? []
    : type === 'artist'
      ? result?.artists.map(mapArtist) ?? []
      : result?.playlists.map(mapSearchPlaylist) ?? [];
  const total = type === 'album'
    ? result?.albumCount ?? page * pageSize + items.length
    : type === 'artist'
      ? result?.artistCount ?? page * pageSize + items.length
      : result?.playlistCount ?? page * pageSize + items.length;
  return {
    type,
    items,
    page,
    pageSize,
    hasMore: result?.more ?? page * pageSize < total,
  };
}

export function mapTrackDetail(raw: RawSearchResponse | { result?: { songs?: RawSong[] } }): Track | null {
  const song = raw.result?.songs?.[0];
  return song ? mapTrack(song, song.privilege) : null;
}

export function mapDetailTrack(song: RawSong, privilege?: RawPrivilege): Track {
  return mapTrack(song, privilege ?? song.privilege);
}

function qualityFromBitrate(bitrate: number | null | undefined, fallback: AudioQuality): AudioQuality {
  if (bitrate == null) return fallback === 'auto' ? 'standard' : fallback;
  if (bitrate >= 900_000) return 'hi_res';
  if (bitrate >= 500_000) return 'lossless';
  if (bitrate >= 300_000) return 'high';
  return 'standard';
}

function qualityFromUpstream(level: string | null | undefined, encodeType: string | null | undefined): AudioQuality | null {
  switch (level?.toLowerCase()) {
    case 'standard':
      return 'standard';
    case 'higher':
    case 'exhigh':
      return 'high';
    case 'lossless':
      return 'lossless';
    case 'hires':
    case 'jymaster':
    case 'sky':
      return 'hi_res';
  }

  switch (encodeType?.toLowerCase()) {
    case 'flac':
    case 'wav':
    case 'ape':
      return 'lossless';
    default:
      return null;
  }
}

export function mapStream(
  raw: RawStreamResponse,
  trackId: string,
  requestedQuality: AudioQuality,
): StreamInfo | null {
  const item = raw.data.find((candidate) => candidate.id === trackId) ?? raw.data[0];
  const url = safeUrl(item?.url);
  if (!item || !url) return null;

  return {
    trackId,
    url,
    requestedQuality,
    actualQuality: qualityFromUpstream(item.level, item.encodeType) ?? qualityFromBitrate(item.br, requestedQuality),
    mimeType: item.type
      ? item.type.startsWith('audio/')
        ? item.type
        : `audio/${item.type}`
      : null,
    bitrate: item.br ?? null,
    sizeBytes: item.size ?? null,
    expiresAt: item.expi ? new Date(Date.now() + item.expi * 1000).toISOString() : null,
  };
}

function parseTimestamp(value: string): number | null {
  const match = value.match(/^(\d+):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) return null;
  const fraction = (match[3] ?? '').padEnd(3, '0');
  return Number(match[1]) * 60_000 + Number(match[2]) * 1_000 + Number(fraction || 0);
}

export function parseLrc(value: string | null | undefined): Array<{ startMs: number; text: string }> {
  if (!value) return [];
  const lines: Array<{ startMs: number; text: string }> = [];
  for (const line of value.split(/\r?\n/)) {
    const timestamps = [...line.matchAll(/\[(\d+:\d{2}(?:\.\d{1,3})?)\]/g)];
    const text = line.replace(/\[[^\]]+\]/g, '').trim();
    if (!text) continue;
    for (const timestamp of timestamps) {
      const startMs = parseTimestamp(timestamp[1] ?? '');
      if (startMs != null) lines.push({ startMs, text });
    }
  }
  return lines.sort((left, right) => left.startMs - right.startMs);
}

export function mapLyrics(raw: RawLyricsResponse): Lyrics {
  const lines = parseLrc(raw.lrc?.lyric);
  const translations = parseLrc(raw.tlyric?.lyric);
  const translationByStart = new Map(translations.map((line) => [line.startMs, line.text]));
  const mergedLines = lines.map((line, index) => ({
    startMs: line.startMs,
    endMs: lines[index + 1]?.startMs ?? null,
    text: line.text,
    translation: translationByStart.get(line.startMs) ?? null,
  }));

  return {
    type: mergedLines.length > 0 ? 'LINE' : 'NONE',
    lines: mergedLines,
    raw: {
      lrc: raw.lrc?.lyric ?? null,
      translatedLrc: raw.tlyric?.lyric ?? null,
    },
  };
}

export function mapPlaylist(raw: RawPlaylist, tracks: Track[]): PlaylistDetail {
  return {
    id: raw.id,
    name: raw.name.trim() || '未命名歌单',
    artworkUrl: safeUrl(raw.coverImgUrl ?? raw.picUrl),
    creator: raw.creator
      ? { id: raw.creator.userId, name: raw.creator.nickname || '未知用户', avatarUrl: safeUrl(raw.creator.avatarUrl) }
      : null,
    trackCount: raw.trackCount ?? tracks.length,
    description: raw.description ?? null,
    tracks,
    subscribed: raw.subscribed,
  };
}
