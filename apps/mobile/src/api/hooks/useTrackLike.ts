import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LikeResultSchema } from '@siplayer/contracts';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function useTrackLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ trackId, liked }: { trackId: string; liked: boolean }) => {
      const response = await apiClient.request(`/v1/tracks/${encodeURIComponent(trackId)}/like`, { method: liked ? 'PUT' : 'DELETE' }, LikeResultSchema);
      return response.data;
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.recent });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.liked });
      void queryClient.invalidateQueries({ queryKey: queryKeys.search.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.track.detail(variables.trackId) });
    },
  });
}
