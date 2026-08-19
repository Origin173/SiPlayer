import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StreamInfo } from '@siplayer/contracts';
import { apiClient } from '../api/client';
import { resolveStream } from './playbackResolver';

vi.mock('../api/client', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

const request = vi.mocked(apiClient.request);

const stream: StreamInfo = {
  trackId: 'track/1',
  url: 'https://audio.example.com/track.mp3',
  requestedQuality: 'lossless',
  actualQuality: 'high',
};

describe('playback resolver', () => {
  beforeEach(() => request.mockReset());

  it('encodes the track id and sends the selected quality', async () => {
    request.mockResolvedValue({ data: stream, requestId: 'req_test' });

    await expect(resolveStream('track/1?draft', 'lossless')).resolves.toEqual(stream);

    expect(request).toHaveBeenCalledWith(
      '/v1/tracks/track%2F1%3Fdraft/stream?quality=lossless',
      undefined,
      expect.anything(),
    );
  });

  it('rejects an unsupported quality before making a request', async () => {
    await expect(resolveStream('track-1', 'studio' as never)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
