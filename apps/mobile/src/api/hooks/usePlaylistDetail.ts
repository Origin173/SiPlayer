import { useQuery } from '@tanstack/react-query';
import { PlaylistDetailSchema } from '@siplayer/contracts';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function usePlaylistDetail(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.playlist.detail(id) : ['playlist', 'empty'],
    queryFn: async ({ signal }) => {
      if (!id) throw new Error('Playlist id is required');
      const response = await apiClient.request(`/v1/playlists/${encodeURIComponent(id)}`, { signal }, PlaylistDetailSchema);
      return response.data;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
