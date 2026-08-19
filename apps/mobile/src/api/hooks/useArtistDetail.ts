import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArtistAlbumPageSchema, ArtistDetailSchema, TrackSchema } from '@siplayer/contracts';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function useArtistDetail(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.artist.detail(id) : ['artist', 'empty'],
    queryFn: async ({ signal }) => {
      if (!id) throw new Error('Artist id is required');
      const response = await apiClient.request(`/v1/artists/${encodeURIComponent(id)}`, { signal }, ArtistDetailSchema);
      return response.data;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useArtistTopTracks(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.artist.topTracks(id) : ['artist', 'empty', 'top-tracks'],
    queryFn: async ({ signal }) => {
      if (!id) throw new Error('Artist id is required');
      const response = await apiClient.request(`/v1/artists/${encodeURIComponent(id)}/top-tracks`, { signal }, TrackSchema.array());
      return response.data;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useArtistAlbums(id: string | undefined) {
  return useInfiniteQuery({
    queryKey: id ? queryKeys.artist.albums(id) : ['artist', 'empty', 'albums'],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      if (!id) throw new Error('Artist id is required');
      const params = new URLSearchParams({ page: String(pageParam), pageSize: '30' });
      const response = await apiClient.request(`/v1/artists/${encodeURIComponent(id)}/albums?${params.toString()}`, { signal }, ArtistAlbumPageSchema);
      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
