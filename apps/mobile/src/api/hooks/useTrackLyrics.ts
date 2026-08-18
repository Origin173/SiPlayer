import { useQuery } from '@tanstack/react-query';
import { LyricsSchema } from '@siplayer/contracts';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function useTrackLyrics(trackId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: trackId ? queryKeys.track.lyrics(trackId) : ['track', 'lyrics', 'empty'],
    queryFn: async ({ signal }) => {
      if (!trackId) throw new Error('Track id is required');
      const response = await apiClient.request(`/v1/tracks/${encodeURIComponent(trackId)}/lyrics`, { signal }, LyricsSchema);
      return response.data;
    },
    enabled: enabled && Boolean(trackId),
    staleTime: 5 * 60_000,
  });
}
