import { describe, expect, it } from 'vitest';
import { HealthResponseSchema, TrackSchema } from './index';

describe('stable contracts', () => {
  it('accepts a normalized track without upstream fields', () => {
    const track = TrackSchema.parse({
      id: 'track-1',
      name: 'Quiet Morning',
      artists: [{ id: 'artist-1', name: 'Origin' }],
      artistText: 'Origin',
      album: null,
      artworkUrl: null,
      durationMs: 180000,
      playable: true,
    });

    expect(track.id).toBe('track-1');
    expect(track.playable).toBe(true);
  });

  it('keeps the health response envelope stable', () => {
    const response = HealthResponseSchema.parse({
      data: { status: 'ok', version: '0.1.0' },
      requestId: 'req_test',
    });

    expect(response.data.status).toBe('ok');
  });
});
