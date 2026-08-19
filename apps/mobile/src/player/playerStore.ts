import { create } from 'zustand';
import type { AudioQuality } from '@siplayer/contracts';
import type { QueueItem, PlaybackMode, PlaybackState } from './playbackTypes';
import { reorderQueue } from './queueOperations';

interface PlayerStore {
  queue: QueueItem[];
  currentIndex: number;
  playbackState: PlaybackState;
  playbackMode: PlaybackMode;
  quality: AudioQuality;
  positionMs: number;
  durationMs: number;
  replaceQueue: (queue: QueueItem[], startIndex?: number) => void;
  mutateQueue: (queue: QueueItem[], currentIndex?: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  setPlaybackState: (playbackState: PlaybackState) => void;
  setPlaybackMode: (playbackMode: PlaybackMode) => void;
  setQuality: (quality: AudioQuality) => void;
  setPosition: (positionMs: number, durationMs?: number) => void;
  setCurrentIndex: (currentIndex: number) => void;
  clear: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  queue: [],
  currentIndex: -1,
  playbackState: 'idle',
  playbackMode: 'sequential',
  quality: 'auto',
  positionMs: 0,
  durationMs: 0,
  replaceQueue: (queue, startIndex = 0) =>
    set({
      queue,
      currentIndex: queue.length > 0 ? Math.min(Math.max(startIndex, 0), queue.length - 1) : -1,
      playbackState: queue.length > 0 ? 'paused' : 'idle',
      positionMs: 0,
      durationMs: queue.length > 0 ? queue[Math.min(Math.max(startIndex, 0), queue.length - 1)]?.durationMs ?? 0 : 0,
    }),
  mutateQueue: (queue, currentIndex) =>
    set((state) => {
      if (queue.length === 0) {
        return {
          queue: [],
          currentIndex: -1,
          playbackState: 'idle' as const,
          positionMs: 0,
          durationMs: 0,
        };
      }
      const nextIndex = currentIndex ?? state.currentIndex;
      return {
        queue,
        currentIndex: nextIndex >= 0 ? Math.min(nextIndex, queue.length - 1) : -1,
      };
    }),
  reorderQueue: (fromIndex, toIndex) =>
    set((state) => {
      const result = reorderQueue(state.queue, state.currentIndex, fromIndex, toIndex);
      return result ? { queue: result.items, currentIndex: result.currentIndex } : state;
    }),
  setPlaybackState: (playbackState) => set({ playbackState }),
  setPlaybackMode: (playbackMode) => set({ playbackMode }),
  setQuality: (quality) => set({ quality }),
  setPosition: (positionMs, durationMs) => set((state) => ({
    positionMs,
    durationMs: durationMs ?? state.durationMs,
  })),
  setCurrentIndex: (currentIndex) =>
    set((state) => ({
      currentIndex,
      positionMs: 0,
      durationMs: state.queue[currentIndex]?.durationMs ?? 0,
    })),
  clear: () =>
    set({
      queue: [],
      currentIndex: -1,
      playbackState: 'idle',
      positionMs: 0,
      durationMs: 0,
    }),
}));
