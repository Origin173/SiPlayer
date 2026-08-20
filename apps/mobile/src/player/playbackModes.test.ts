import { describe, expect, it } from 'vitest';
import { createShuffleState, nextQueueIndex, nextShuffleIndex, previousShuffleIndex } from './playbackModes';

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

  it('plays every queue item once per shuffle round', () => {
    let state = createShuffleState(4, 0, () => 0.25);
    let current = 0;
    const played = [current];

    for (let index = 0; index < 3; index += 1) {
      const next = nextShuffleIndex(state, current, 4, () => 0.25);
      expect(next.index).not.toBeNull();
      current = next.index!;
      state = next.state;
      played.push(current);
    }

    expect([...new Set(played)].sort()).toEqual([0, 1, 2, 3]);
  });

  it('returns the actual previous item in shuffle history', () => {
    let state = createShuffleState(4, 0, () => 0.25);
    let current = 0;
    const first = nextShuffleIndex(state, current, 4, () => 0.1);
    current = first.index!;
    state = first.state;
    const second = nextShuffleIndex(state, current, 4, () => 0.9);
    current = second.index!;
    state = second.state;

    const previous = previousShuffleIndex(state, current);

    expect(previous.index).toBe(first.index);
  });
});
