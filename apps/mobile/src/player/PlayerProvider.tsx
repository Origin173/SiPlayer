import { createContext, useCallback, useContext, useMemo, type PropsWithChildren } from 'react';
import type { QueueItem, PlayContext, PlaybackMode } from './playbackTypes';
import { usePlayerStore } from './playerStore';

export interface PlayerController {
  playTrack: (track: QueueItem, context?: PlayContext) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seekTo: (positionMs: number) => void;
  next: () => void;
  previous: () => void;
  setQueue: (items: QueueItem[], startIndex?: number) => void;
  addNext: (item: QueueItem) => void;
  addToQueue: (item: QueueItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setMode: (mode: PlaybackMode) => void;
}

const PlayerContext = createContext<PlayerController | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const setQueue = usePlayerStore((state) => state.setQueue);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);
  const setPlaybackMode = usePlayerStore((state) => state.setPlaybackMode);
  const setPosition = usePlayerStore((state) => state.setPosition);
  const setCurrentIndex = usePlayerStore((state) => state.setCurrentIndex);
  const clear = usePlayerStore((state) => state.clear);
  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const playbackState = usePlayerStore((state) => state.playbackState);

  const play = useCallback(() => {
    if (queue.length > 0) setPlaybackState('playing');
  }, [queue.length, setPlaybackState]);

  const pause = useCallback(() => {
    if (queue.length > 0) setPlaybackState('paused');
  }, [queue.length, setPlaybackState]);

  const toggle = useCallback(() => {
    if (queue.length === 0) return;
    setPlaybackState(playbackState === 'playing' ? 'paused' : 'playing');
  }, [playbackState, queue.length, setPlaybackState]);

  const setPlayerQueue = useCallback(
    (items: QueueItem[], startIndex = 0) => {
      setQueue(items, startIndex);
      if (items.length > 0) setPlaybackState('playing');
    },
    [setPlaybackState, setQueue],
  );

  const playTrack = useCallback(
    (track: QueueItem, context?: PlayContext) => {
      if (context?.queue && context.queue.length > 0) {
        const requestedIndex = context.startIndex ?? context.queue.findIndex((item) => item.trackId === track.trackId);
        setPlayerQueue(context.queue, requestedIndex >= 0 ? requestedIndex : 0);
        return;
      }
      setPlayerQueue([track], 0);
    },
    [setPlayerQueue],
  );

  const next = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      setPlaybackState('ended');
      return;
    }
    setCurrentIndex(nextIndex);
    setPlaybackState('playing');
  }, [currentIndex, queue.length, setCurrentIndex, setPlaybackState]);

  const previous = useCallback(() => {
    if (queue.length === 0) return;
    if (usePlayerStore.getState().positionMs > 4000) {
      setPosition(0);
      return;
    }
    const previousIndex = Math.max(currentIndex - 1, 0);
    setCurrentIndex(previousIndex);
    setPlaybackState('playing');
  }, [currentIndex, queue.length, setCurrentIndex, setPlaybackState, setPosition]);

  const addNext = useCallback(
    (item: QueueItem) => {
      const nextQueue = [...queue];
      nextQueue.splice(Math.max(currentIndex + 1, 0), 0, item);
      setQueue(nextQueue, currentIndex < 0 ? 0 : currentIndex);
    },
    [currentIndex, queue, setQueue],
  );

  const addToQueue = useCallback(
    (item: QueueItem) => {
      setQueue([...queue, item], currentIndex < 0 ? 0 : currentIndex);
    },
    [currentIndex, queue, setQueue],
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length) return;
      const nextQueue = queue.filter((_, itemIndex) => itemIndex !== index);
      const nextIndex = nextQueue.length === 0 ? -1 : Math.min(currentIndex > index ? currentIndex - 1 : currentIndex, nextQueue.length - 1);
      if (nextQueue.length === 0) clear();
      else {
        setQueue(nextQueue, Math.max(nextIndex, 0));
        if (nextIndex < 0) setPlaybackState('idle');
      }
    },
    [clear, currentIndex, queue, setPlaybackState, setQueue],
  );

  const controller = useMemo<PlayerController>(
    () => ({
      playTrack,
      play,
      pause,
      toggle,
      seekTo: (positionMs) => setPosition(Math.max(positionMs, 0)),
      next,
      previous,
      setQueue: setPlayerQueue,
      addNext,
      addToQueue,
      removeFromQueue,
      clearQueue: clear,
      setMode: setPlaybackMode,
    }),
    [addNext, addToQueue, clear, next, pause, play, playTrack, previous, setPlaybackMode, setPlayerQueue, setPosition, toggle],
  );

  return <PlayerContext.Provider value={controller}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerController {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used inside PlayerProvider');
  return value;
}
