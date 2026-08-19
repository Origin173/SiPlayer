import { useInfiniteQuery } from '@tanstack/react-query';
import { CatalogSearchPageSchema, type SearchType } from '@siplayer/contracts';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

type CatalogSearchType = Exclude<SearchType, 'track'>;

export function useCatalogSearch(keyword: string, type: CatalogSearchType, enabled = true) {
  const normalizedKeyword = keyword.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.search.catalog(type, normalizedKeyword),
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ q: normalizedKeyword, type, page: String(pageParam), pageSize: '30' });
      const response = await apiClient.request(`/v1/search?${params.toString()}`, { signal }, CatalogSearchPageSchema);
      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: enabled && normalizedKeyword.length > 0,
    staleTime: 30_000,
  });
}
