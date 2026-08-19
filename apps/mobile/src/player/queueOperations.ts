import type { QueueItem } from './playbackTypes';

export interface ReorderedQueue {
  items: QueueItem[];
  currentIndex: number;
}

export function reorderQueue(items: QueueItem[], currentIndex: number, fromIndex: number, toIndex: number): ReorderedQueue | null {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) return null;

  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  if (!moved) return null;
  nextItems.splice(toIndex, 0, moved);

  let nextCurrentIndex = currentIndex;
  if (fromIndex === currentIndex) nextCurrentIndex = toIndex;
  else if (fromIndex < currentIndex && toIndex >= currentIndex) nextCurrentIndex -= 1;
  else if (fromIndex > currentIndex && toIndex <= currentIndex) nextCurrentIndex += 1;

  return { items: nextItems, currentIndex: nextCurrentIndex };
}
