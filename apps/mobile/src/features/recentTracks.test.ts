import type { Track } from '@siplayer/contracts';
import { describe, expect, it } from 'vitest';
import { mergeRecentTracks } from './recentTracks';

function track(id: string): Track {
  return {
    id,
    name: `Track ${id}`,
    artists: [{ id: `artist-${id}`, name: 'Origin' }],
    artistText: 'Origin',
    album: null,
    artworkUrl: null,
    durationMs: 180_000,
    playable: true,
  };
}

describe('mergeRecentTracks', () => {
  it('merges local and cloud history without duplicate track ids', () => {
    const result = mergeRecentTracks(
      [track('a'), track('b'), track('c')],
      [track('c'), track('d'), track('e')],
    );

    expect(result.map((item) => item.id)).toEqual(['c', 'd', 'e', 'a', 'b']);
  });
});
