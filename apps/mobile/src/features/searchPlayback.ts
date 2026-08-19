import type { Track } from '@siplayer/contracts';
import { queueItemFromTrack, type QueueItem } from '../player/playbackTypes';

export interface SearchPlaySelection {
  item: QueueItem;
  queue: QueueItem[];
  startIndex: number;
}

export function createSearchPlaySelection(tracks: Track[], trackId: string): SearchPlaySelection | null {
  const queue = tracks.filter((track) => track.playable).map(queueItemFromTrack);
  const startIndex = queue.findIndex((item) => item.trackId === trackId);
  const item = queue[startIndex];
  if (!item || startIndex < 0) return null;
  return { item, queue, startIndex };
}
