import { useQuery } from '@tanstack/react-query';
import { CatalogSearchPageSchema, type SearchType } from '@siplayer/contracts';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

type CatalogSearchType = Exclude<SearchType, 'track'>;

export function useCatalogSearch(keyword: string, type: CatalogSearchType, enabled = true) {
  const normalizedKeyword = keyword.trim();
  return useQuery({
    queryKey: queryKeys.search.catalog(type, normalizedKeyword),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ q: normalizedKeyword, type, page: '1', pageSize: '30' });
      const response = await apiClient.request(`/v1/search?${params.toString()}`, { signal }, CatalogSearchPageSchema);
      return response.data;
    },
    enabled: enabled && normalizedKeyword.length > 0,
    staleTime: 30_000,
  });
}
