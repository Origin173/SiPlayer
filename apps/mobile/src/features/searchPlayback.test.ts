import type { Track } from '@siplayer/contracts';
import { describe, expect, it } from 'vitest';
import { createSearchPlaySelection } from './searchPlayback';

function track(id: string, playable: boolean): Track {
  return {
    id,
    name: `Track ${id}`,
    artists: [{ id: `artist-${id}`, name: 'Origin' }],
    artistText: 'Origin',
    album: null,
    artworkUrl: null,
    durationMs: 180000,
    playable,
  };
}

describe('createSearchPlaySelection', () => {
  it('builds a playable queue and reindexes the selected result', () => {
    const results = [track('blocked', false), track('one', true), track('two', true)];

    const selection = createSearchPlaySelection(results, 'two');

    expect(selection).not.toBeNull();
    expect(selection?.queue.map((item) => item.trackId)).toEqual(['one', 'two']);
    expect(selection?.item.trackId).toBe('two');
    expect(selection?.startIndex).toBe(1);
  });

  it('returns no selection for an unavailable result or unknown id', () => {
    const results = [track('blocked', false), track('one', true)];

    expect(createSearchPlaySelection(results, 'blocked')).toBeNull();
    expect(createSearchPlaySelection(results, 'missing')).toBeNull();
  });
});
