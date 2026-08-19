import { useInfiniteQuery } from '@tanstack/react-query';
import { TrackPageSchema } from '@siplayer/contracts';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function useTrackSearch(keyword: string, enabled = true) {
  const normalizedKeyword = keyword.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.search.tracks(normalizedKeyword),
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ q: normalizedKeyword, type: 'track', page: String(pageParam), pageSize: '30' });
      const response = await apiClient.request(`/v1/search?${params.toString()}`, { signal }, TrackPageSchema);
      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: enabled && normalizedKeyword.length > 0,
    staleTime: 30_000,
  });
}
