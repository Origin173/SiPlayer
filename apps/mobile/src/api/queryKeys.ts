export const queryKeys = {
  search: {
    all: ['search'] as const,
    tracks: (keyword: string, page = 1) => ['search', 'track', keyword, page] as const,
    catalog: (type: 'album' | 'artist' | 'playlist', keyword: string, page = 1) => ['search', type, keyword, page] as const,
  },
  track: {
    detail: (id: string) => ['track', id] as const,
    lyrics: (id: string) => ['track', id, 'lyrics'] as const,
  },
  playlist: {
    detail: (id: string) => ['playlist', id] as const,
  },
  album: {
    detail: (id: string) => ['album', id] as const,
  },
  artist: {
    detail: (id: string) => ['artist', id] as const,
    topTracks: (id: string) => ['artist', id, 'top-tracks'] as const,
    albums: (id: string, page = 1) => ['artist', id, 'albums', page] as const,
  },
  me: {
    profile: ['me', 'profile'] as const,
    playlists: ['me', 'playlists'] as const,
    recent: ['me', 'recent-tracks'] as const,
    liked: ['me', 'liked-tracks'] as const,
  },
};
