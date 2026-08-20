import type { Track } from '@siplayer/contracts';

export function mergeRecentTracks(cloud: Track[], local: Track[]): Track[] {
  const seen = new Set<string>();
  const result: Track[] = [];

  for (const track of [...local, ...cloud]) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    result.push(track);
  }

  return result;
}
