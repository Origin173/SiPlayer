import { describe, expect, it } from 'vitest';
import { formatTime } from './formatTime';

describe('formatTime', () => {
  it('formats a duration as minutes and seconds', () => {
    expect(formatTime(185000)).toBe('3:05');
  });

  it('does not return negative values', () => {
    expect(formatTime(-1)).toBe('0:00');
  });
});
