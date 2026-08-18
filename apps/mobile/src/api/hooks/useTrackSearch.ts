import { useQuery } from '@tanstack/react-query';
import { TrackPageSchema } from '@siplayer/contracts';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function useTrackSearch(keyword: string, enabled = true) {
  const normalizedKeyword = keyword.trim();
  return useQuery({
    queryKey: queryKeys.search.tracks(normalizedKeyword),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ q: normalizedKeyword, type: 'track', page: '1', pageSize: '30' });
      const response = await apiClient.request(`/v1/search?${params.toString()}`, { signal }, TrackPageSchema);
      return response.data;
    },
    enabled: enabled && normalizedKeyword.length > 0,
    staleTime: 30_000,
  });
}
