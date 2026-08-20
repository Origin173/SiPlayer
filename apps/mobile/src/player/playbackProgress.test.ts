import { describe, expect, it } from 'vitest';
import { getPlaybackProgress } from './playbackProgress';

describe('getPlaybackProgress', () => {
  it('returns a bounded position ratio', () => {
    expect(getPlaybackProgress(25, 100)).toBe(0.25);
    expect(getPlaybackProgress(-1, 100)).toBe(0);
    expect(getPlaybackProgress(101, 100)).toBe(1);
  });

  it('returns zero when duration is not known', () => {
    expect(getPlaybackProgress(25, 0)).toBe(0);
  });
});
