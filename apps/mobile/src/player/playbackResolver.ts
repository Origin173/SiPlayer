import { AudioQualitySchema, StreamInfoSchema, type AudioQuality, type StreamInfo } from '@siplayer/contracts';
import { apiClient } from '../api/client';

export async function resolveStream(trackId: string, quality: AudioQuality = 'auto', signal?: AbortSignal): Promise<StreamInfo> {
  const safeQuality = AudioQualitySchema.parse(quality);
  const query = new URLSearchParams({ quality: safeQuality });
  const response = await apiClient.request(
    `/v1/tracks/${encodeURIComponent(trackId)}/stream?${query.toString()}`,
    signal ? { signal } : undefined,
    StreamInfoSchema,
  );
  return response.data;
}
