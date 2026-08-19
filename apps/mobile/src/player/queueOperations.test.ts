import { describe, expect, it } from 'vitest';
import { reorderQueue } from './queueOperations';

const items = ['a', 'b', 'c', 'd'].map((trackId) => ({ trackId, title: trackId, artistText: 'Artist' }));

describe('queue operations', () => {
  it('moves an item and keeps the current item selected', () => {
    const result = reorderQueue(items, 2, 0, 3);

    expect(result?.items.map((item) => item.trackId)).toEqual(['b', 'c', 'd', 'a']);
    expect(result?.currentIndex).toBe(1);
  });

  it('updates the index when the current item itself moves', () => {
    const result = reorderQueue(items, 1, 1, 3);

    expect(result?.items.map((item) => item.trackId)).toEqual(['a', 'c', 'd', 'b']);
    expect(result?.currentIndex).toBe(3);
  });

  it('rejects invalid or no-op moves', () => {
    expect(reorderQueue(items, 0, 0, 0)).toBeNull();
    expect(reorderQueue(items, 0, -1, 1)).toBeNull();
    expect(reorderQueue(items, 0, 1, 9)).toBeNull();
  });
});
