import { useQuery } from '@tanstack/react-query';
import { PlaylistCollectionsSchema, TrackPageSchema } from '@siplayer/contracts';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function useUserPlaylists(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me.playlists,
    queryFn: async ({ signal }) => {
      const response = await apiClient.request('/v1/me/playlists', { signal }, PlaylistCollectionsSchema);
      return response.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useLikedTracks(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me.liked,
    queryFn: async ({ signal }) => {
      const response = await apiClient.request('/v1/me/liked-tracks', { signal }, TrackPageSchema);
      return response.data;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useRecentTracks(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me.recent,
    queryFn: async ({ signal }) => {
      const response = await apiClient.request('/v1/me/recent-tracks', { signal }, TrackPageSchema);
      return response.data;
    },
    enabled,
    staleTime: 30_000,
  });
}
