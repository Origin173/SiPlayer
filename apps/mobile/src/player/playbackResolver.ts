import { AudioQualitySchema, StreamInfoSchema, type AudioQuality, type StreamInfo } from '@siplayer/contracts';
import { ApiError, apiClient } from '@/api/client';

export async function resolveStream(trackId: string, quality: AudioQuality = 'auto'): Promise<StreamInfo> {
  const safeQuality = AudioQualitySchema.parse(quality);
  const query = new URLSearchParams({ quality: safeQuality });
  let attempt = 0;

  while (true) {
    try {
      const response = await apiClient.request(
        `/v1/tracks/${encodeURIComponent(trackId)}/stream?${query.toString()}`,
        undefined,
        StreamInfoSchema,
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.retryable && attempt === 0) {
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
}
