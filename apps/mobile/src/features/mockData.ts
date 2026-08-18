import type { PlaylistSummary, Track } from '@siplayer/contracts';

export const mockTracks: Track[] = [
  {
    id: 'mock-quiet-morning',
    name: 'Quiet Morning',
    artists: [{ id: 'mock-origin', name: 'Origin' }],
    artistText: 'Origin',
    album: { id: 'mock-album-1', name: 'Soft Signals', artists: [{ id: 'mock-origin', name: 'Origin' }] },
    artworkUrl: null,
    durationMs: 214000,
    playable: true,
  },
  {
    id: 'mock-afterglow',
    name: 'Afterglow',
    artists: [{ id: 'mock-lumen', name: 'Lumen' }],
    artistText: 'Lumen',
    album: { id: 'mock-album-2', name: 'After Rain', artists: [{ id: 'mock-lumen', name: 'Lumen' }] },
    artworkUrl: null,
    durationMs: 196000,
    playable: true,
  },
  {
    id: 'mock-slow-tide',
    name: 'Slow Tide',
    artists: [{ id: 'mock-shore', name: 'Shoreline' }],
    artistText: 'Shoreline',
    album: { id: 'mock-album-3', name: 'Low Water', artists: [{ id: 'mock-shore', name: 'Shoreline' }] },
    artworkUrl: null,
    durationMs: 241000,
    playable: true,
  },
  {
    id: 'mock-unavailable',
    name: 'Unavailable Demo',
    artists: [{ id: 'mock-origin', name: 'Origin' }],
    artistText: 'Origin',
    album: null,
    artworkUrl: null,
    durationMs: 180000,
    playable: false,
    availability: { reason: 'PRIVILEGE_REQUIRED', message: '当前歌曲暂不可播放' },
  },
];

export const mockPlaylists: PlaylistSummary[] = [
  { id: 'mock-focus', name: '专注时刻', artworkUrl: null, creator: null, trackCount: 24 },
  { id: 'mock-night', name: '夜晚慢歌', artworkUrl: null, creator: null, trackCount: 18 },
];
