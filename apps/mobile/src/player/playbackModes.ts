import type { PlaybackMode } from './playbackTypes';

export function nextQueueIndex(mode: PlaybackMode, currentIndex: number, length: number, randomValue = Math.random()): number | null {
  if (length <= 0 || currentIndex < 0 || currentIndex >= length) return null;
  if (mode === 'repeat_one') return currentIndex;
  if (mode === 'repeat_all') return (currentIndex + 1) % length;
  if (mode === 'shuffle') {
    if (length === 1) return currentIndex;
    const candidates = Array.from({ length }, (_, index) => index).filter((index) => index !== currentIndex);
    return candidates[Math.min(Math.floor(randomValue * candidates.length), candidates.length - 1)] ?? null;
  }
  return currentIndex + 1 < length ? currentIndex + 1 : null;
}
