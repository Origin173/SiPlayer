import type { PlaylistSummary, Track, UserProfile } from '@siplayer/contracts';
import type {
  RawLoginStatusResponse,
  RawRecentTracksResponse,
} from './authRawTypes.js';
import type { RawPlaylist } from './rawTypes.js';
import { mapDetailTrack, safeUrl } from './mapper.js';

export function mapUserProfile(raw: RawLoginStatusResponse): UserProfile | null {
  const profile = raw.profile;
  const id = profile?.userId ?? raw.account?.id;
  if (!id) return null;
  return {
    id,
    nickname: profile?.nickname || '网易云用户',
    avatarUrl: safeUrl(profile?.avatarUrl),
    signature: profile?.signature ?? null,
  };
}

export function mapPlaylistSummary(raw: RawPlaylist): PlaylistSummary {
  return {
    id: raw.id,
    name: raw.name.trim() || '未命名歌单',
    artworkUrl: safeUrl(raw.coverImgUrl ?? raw.picUrl),
    creator: raw.creator
      ? { id: raw.creator.userId, name: raw.creator.nickname || '未知用户', avatarUrl: safeUrl(raw.creator.avatarUrl) }
      : null,
    trackCount: raw.trackCount ?? raw.trackIds.length,
    description: raw.description ?? null,
  };
}

export function mapRecentTracks(raw: RawRecentTracksResponse): Track[] {
  return raw.allData.map((entry) => mapDetailTrack(entry.song, entry.song.privilege));
}
