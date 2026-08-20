export function getPlaybackProgress(positionMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.min(Math.max(positionMs / durationMs, 0), 1);
}
