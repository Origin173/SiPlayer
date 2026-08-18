export const queryKeys = {
  search: {
    all: ['search'] as const,
    tracks: (keyword: string, page = 1) => ['search', 'track', keyword, page] as const,
  },
  track: {
    detail: (id: string) => ['track', id] as const,
    lyrics: (id: string) => ['track', id, 'lyrics'] as const,
  },
  playlist: {
    detail: (id: string) => ['playlist', id] as const,
  },
  me: {
    profile: ['me', 'profile'] as const,
    playlists: ['me', 'playlists'] as const,
  },
};
