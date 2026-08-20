import { create } from 'zustand';
import type { AudioQuality, Track } from '@siplayer/contracts';
import type { QueueItem, PlaybackMode, PlaybackState } from './playbackTypes';
import { createShuffleState, type ShuffleState } from './playbackModes';
import { reorderQueue } from './queueOperations';

interface PlayerStore {
  queue: QueueItem[];
  currentIndex: number;
  playbackState: PlaybackState;
  playbackMode: PlaybackMode;
  quality: AudioQuality;
  positionMs: number;
  durationMs: number;
  shuffleOrder: number[];
  shuffleCursor: number;
  playHistory: number[];
  replaceQueue: (queue: QueueItem[], startIndex?: number) => void;
  mutateQueue: (queue: QueueItem[], currentIndex?: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  setPlaybackState: (playbackState: PlaybackState) => void;
  setPlaybackMode: (playbackMode: PlaybackMode) => void;
  setQuality: (quality: AudioQuality) => void;
  setPosition: (positionMs: number, durationMs?: number) => void;
  setCurrentIndex: (currentIndex: number) => void;
  setShuffleState: (state: ShuffleState) => void;
  updateTrackMetadata: (trackId: string, patch: Partial<Pick<Track, 'liked'>>) => void;
  clear: () => void;
}

const emptyShuffleState = (currentIndex: number): ShuffleState => ({
  order: [],
  cursor: -1,
  history: currentIndex >= 0 ? [currentIndex] : [],
});

export const usePlayerStore = create<PlayerStore>((set) => ({
  queue: [],
  currentIndex: -1,
  playbackState: 'idle',
  playbackMode: 'sequential',
  quality: 'auto',
  positionMs: 0,
  durationMs: 0,
  shuffleOrder: [],
  shuffleCursor: -1,
  playHistory: [],
  replaceQueue: (queue, startIndex = 0) =>
    set((state) => {
      const currentIndex = queue.length > 0 ? Math.min(Math.max(startIndex, 0), queue.length - 1) : -1;
      const shuffle = state.playbackMode === 'shuffle'
        ? createShuffleState(queue.length, currentIndex)
        : emptyShuffleState(currentIndex);
      return {
        queue,
        currentIndex,
        playbackState: queue.length > 0 ? 'paused' : 'idle' as const,
        positionMs: 0,
        durationMs: queue.length > 0 ? queue[currentIndex]?.durationMs ?? 0 : 0,
        shuffleOrder: shuffle.order,
        shuffleCursor: shuffle.cursor,
        playHistory: shuffle.history,
      };
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
          shuffleOrder: [],
          shuffleCursor: -1,
          playHistory: [],
        };
      }
      const nextIndex = currentIndex ?? state.currentIndex;
      const shuffle = state.playbackMode === 'shuffle'
        ? createShuffleState(queue.length, nextIndex)
        : emptyShuffleState(nextIndex);
      return {
        queue,
        currentIndex: nextIndex >= 0 ? Math.min(nextIndex, queue.length - 1) : -1,
        shuffleOrder: shuffle.order,
        shuffleCursor: shuffle.cursor,
        playHistory: shuffle.history,
      };
    }),
  reorderQueue: (fromIndex, toIndex) =>
    set((state) => {
      const result = reorderQueue(state.queue, state.currentIndex, fromIndex, toIndex);
      if (!result) return state;
      const shuffle = state.playbackMode === 'shuffle'
        ? createShuffleState(result.items.length, result.currentIndex)
        : emptyShuffleState(result.currentIndex);
      return {
        queue: result.items,
        currentIndex: result.currentIndex,
        shuffleOrder: shuffle.order,
        shuffleCursor: shuffle.cursor,
        playHistory: shuffle.history,
      };
    }),
  setPlaybackState: (playbackState) => set({ playbackState }),
  setPlaybackMode: (playbackMode) =>
    set((state) => {
      const shuffle = playbackMode === 'shuffle'
        ? createShuffleState(state.queue.length, state.currentIndex)
        : emptyShuffleState(state.currentIndex);
      return {
        playbackMode,
        shuffleOrder: shuffle.order,
        shuffleCursor: shuffle.cursor,
        playHistory: shuffle.history,
      };
    }),
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
  setShuffleState: (shuffle) => set({
    shuffleOrder: shuffle.order,
    shuffleCursor: shuffle.cursor,
    playHistory: shuffle.history,
  }),
  updateTrackMetadata: (trackId, patch) => set((state) => ({
    queue: state.queue.map((item) => item.trackId === trackId && item.track
      ? { ...item, track: { ...item.track, ...patch } }
      : item),
  })),
  clear: () =>
    set({
      queue: [],
      currentIndex: -1,
      playbackState: 'idle',
      positionMs: 0,
      durationMs: 0,
      shuffleOrder: [],
      shuffleCursor: -1,
      playHistory: [],
    }),
}));
