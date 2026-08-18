import { create } from 'zustand';
import type { QueueItem, PlaybackMode, PlaybackState } from './playbackTypes';

interface PlayerStore {
  queue: QueueItem[];
  currentIndex: number;
  playbackState: PlaybackState;
  playbackMode: PlaybackMode;
  positionMs: number;
  durationMs: number;
  setQueue: (queue: QueueItem[], startIndex?: number) => void;
  setPlaybackState: (playbackState: PlaybackState) => void;
  setPlaybackMode: (playbackMode: PlaybackMode) => void;
  setPosition: (positionMs: number, durationMs?: number) => void;
  setCurrentIndex: (currentIndex: number) => void;
  clear: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  queue: [],
  currentIndex: -1,
  playbackState: 'idle',
  playbackMode: 'sequential',
  positionMs: 0,
  durationMs: 0,
  setQueue: (queue, startIndex = 0) =>
    set({
      queue,
      currentIndex: queue.length > 0 ? Math.min(Math.max(startIndex, 0), queue.length - 1) : -1,
      playbackState: queue.length > 0 ? 'paused' : 'idle',
      positionMs: 0,
      durationMs: queue.length > 0 ? queue[Math.min(Math.max(startIndex, 0), queue.length - 1)]?.durationMs ?? 0 : 0,
    }),
  setPlaybackState: (playbackState) => set({ playbackState }),
  setPlaybackMode: (playbackMode) => set({ playbackMode }),
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
