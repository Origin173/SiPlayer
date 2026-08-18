import { describe, expect, it } from 'vitest';
import { nextQueueIndex } from './playbackModes';

describe('queue playback modes', () => {
  it('stops at the end for sequential mode', () => {
    expect(nextQueueIndex('sequential', 1, 2)).toBeNull();
  });

  it('wraps repeat all and stays on repeat one', () => {
    expect(nextQueueIndex('repeat_all', 1, 2)).toBe(0);
    expect(nextQueueIndex('repeat_one', 1, 2)).toBe(1);
  });

  it('chooses a different item in shuffle mode', () => {
    expect(nextQueueIndex('shuffle', 1, 3, 0)).toBe(0);
    expect(nextQueueIndex('shuffle', 1, 3, 0.99)).toBe(2);
    expect(nextQueueIndex('shuffle', 0, 1, 0.5)).toBe(0);
  });
});
