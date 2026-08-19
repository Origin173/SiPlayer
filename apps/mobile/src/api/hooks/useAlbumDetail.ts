import { useQuery } from '@tanstack/react-query';
import { AlbumDetailSchema } from '@siplayer/contracts';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function useAlbumDetail(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.album.detail(id) : ['album', 'empty'],
    queryFn: async ({ signal }) => {
      if (!id) throw new Error('Album id is required');
      const response = await apiClient.request(`/v1/albums/${encodeURIComponent(id)}`, { signal }, AlbumDetailSchema);
      return response.data;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
