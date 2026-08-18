import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type PropsWithChildren } from 'react';
import { ApiError } from '@/api/client';
import { recordLocalTrack } from '@/features/localHistory';
import { resolveStream } from './playbackResolver';
import { nextQueueIndex } from './playbackModes';
import type { PlayContext, PlaybackMode, QueueItem } from './playbackTypes';
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
  clearNext: () => void;
  clearQueue: () => void;
  setMode: (mode: PlaybackMode) => void;
}

const PlayerContext = createContext<PlayerController | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const audioPlayer = useAudioPlayer(null, { updateInterval: 500, keepAudioSessionActive: true });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);
  const setPlaybackMode = usePlayerStore((state) => state.setPlaybackMode);
  const setPosition = usePlayerStore((state) => state.setPosition);
  const setCurrentIndex = usePlayerStore((state) => state.setCurrentIndex);
  const clear = usePlayerStore((state) => state.clear);
  const generationRef = useRef(0);
  const resolvedTrackIdRef = useRef<string | null>(null);
  const streamRetryCountRef = useRef(0);
  const finishHandledGenerationRef = useRef(-1);
  const nextRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  const resolveAndPlay = useCallback(
    async (item: QueueItem, isRetry = false) => {
      const generation = ++generationRef.current;
      if (!isRetry) streamRetryCountRef.current = 0;
      resolvedTrackIdRef.current = null;
      setPlaybackState('resolving');

      try {
        const stream = await resolveStream(item.trackId);
        if (generation !== generationRef.current) return;
        audioPlayer.replace({ uri: stream.url, name: item.title });
        audioPlayer.setActiveForLockScreen(true, {
          title: item.title,
          artist: item.artistText,
          ...(item.albumTitle ? { albumTitle: item.albumTitle } : {}),
          ...(item.artworkUrl ? { artworkUrl: item.artworkUrl } : {}),
        });
        resolvedTrackIdRef.current = item.trackId;
        if (!isRetry && item.track) void recordLocalTrack(item.track);
        setPlaybackState('loading');
        audioPlayer.play();
      } catch (error) {
        if (generation !== generationRef.current) return;
        resolvedTrackIdRef.current = null;
        setPlaybackState(error instanceof ApiError && error.code === 'TRACK_UNAVAILABLE' ? 'unavailable' : 'error');
      }
    },
    [audioPlayer, setPlaybackState],
  );

  const goToIndex = useCallback(
    (index: number, items = usePlayerStore.getState().queue) => {
      const item = items[index];
      if (!item) return;
      setCurrentIndex(index);
      void resolveAndPlay(item);
    },
    [resolveAndPlay, setCurrentIndex],
  );

  const play = useCallback(() => {
    const state = usePlayerStore.getState();
    const item = state.queue[state.currentIndex];
    if (!item) return;
    if (resolvedTrackIdRef.current === item.trackId) {
      audioPlayer.play();
      setPlaybackState('playing');
    } else {
      void resolveAndPlay(item);
    }
  }, [audioPlayer, resolveAndPlay, setPlaybackState]);

  const pause = useCallback(() => {
    if (usePlayerStore.getState().queue.length === 0) return;
    audioPlayer.pause();
    setPlaybackState('paused');
  }, [audioPlayer, setPlaybackState]);

  const toggle = useCallback(() => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0) return;
    if (state.playbackState === 'playing') pause();
    else play();
  }, [pause, play]);

  const setPlayerQueue = useCallback(
    (items: QueueItem[], startIndex = 0) => {
      setQueue(items, startIndex);
      const safeIndex = items.length > 0 ? Math.min(Math.max(startIndex, 0), items.length - 1) : -1;
      const item = items[safeIndex];
      if (item) void resolveAndPlay(item);
    },
    [resolveAndPlay, setQueue],
  );

  const playTrack = useCallback(
    (track: QueueItem, context?: PlayContext) => {
      if (context?.queue && context.queue.length > 0) {
        const requestedIndex = context.startIndex ?? context.queue.findIndex((item) => item.trackId === track.trackId);
        setPlayerQueue(context.queue, requestedIndex >= 0 ? requestedIndex : 0);
      } else {
        setPlayerQueue([track], 0);
      }
    },
    [setPlayerQueue],
  );

  const next = useCallback(() => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0) return;
    const nextIndex = nextQueueIndex(state.playbackMode, state.currentIndex, state.queue.length);
    if (nextIndex == null) {
      audioPlayer.pause();
      setPlaybackState('ended');
      return;
    }
    goToIndex(nextIndex);
  }, [audioPlayer, goToIndex, setPlaybackState]);
  nextRef.current = next;

  const previous = useCallback(() => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0) return;
    if (state.positionMs > 4_000) {
      void audioPlayer.seekTo(0);
      setPosition(0);
      return;
    }
    goToIndex(Math.max(state.currentIndex - 1, 0));
  }, [audioPlayer, goToIndex, setPosition]);

  const addNext = useCallback(
    (item: QueueItem) => {
      const state = usePlayerStore.getState();
      const nextQueue = [...state.queue];
      nextQueue.splice(Math.max(state.currentIndex + 1, 0), 0, item);
      setQueue(nextQueue, state.currentIndex < 0 ? 0 : state.currentIndex);
      setPlaybackState(state.playbackState);
    },
    [setPlaybackState, setQueue],
  );

  const addToQueue = useCallback(
    (item: QueueItem) => {
      const state = usePlayerStore.getState();
      setQueue([...state.queue, item], state.currentIndex < 0 ? 0 : state.currentIndex);
      setPlaybackState(state.playbackState);
    },
    [setPlaybackState, setQueue],
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      const state = usePlayerStore.getState();
      if (index < 0 || index >= state.queue.length) return;
      const nextQueue = state.queue.filter((_, itemIndex) => itemIndex !== index);
      if (nextQueue.length === 0) {
        clear();
        audioPlayer.pause();
        audioPlayer.clearLockScreenControls();
        resolvedTrackIdRef.current = null;
        return;
      }
      const nextIndex = Math.min(state.currentIndex > index ? state.currentIndex - 1 : state.currentIndex, nextQueue.length - 1);
      setQueue(nextQueue, Math.max(nextIndex, 0));
      if (index === state.currentIndex) {
        const nextItem = nextQueue[Math.max(nextIndex, 0)];
        if (nextItem) void resolveAndPlay(nextItem);
      } else {
        setPlaybackState(state.playbackState);
      }
    },
    [audioPlayer, clear, resolveAndPlay, setPlaybackState, setQueue],
  );

  const clearNext = useCallback(() => {
    const state = usePlayerStore.getState();
    if (state.currentIndex < 0 || state.currentIndex >= state.queue.length - 1) return;
    const nextQueue = state.queue.slice(0, state.currentIndex + 1);
    setQueue(nextQueue, state.currentIndex);
    setPosition(state.positionMs, state.durationMs);
    setPlaybackState(state.playbackState);
  }, [setPlaybackState, setPosition, setQueue]);

  const clearQueue = useCallback(() => {
    generationRef.current += 1;
    resolvedTrackIdRef.current = null;
    clear();
    audioPlayer.pause();
    audioPlayer.clearLockScreenControls();
  }, [audioPlayer, clear]);

  const seekTo = useCallback(
    (positionMs: number) => {
      const nextPosition = Math.max(positionMs, 0);
      setPosition(nextPosition);
      void audioPlayer.seekTo(nextPosition / 1000).catch(() => setPlaybackState('error'));
    },
    [audioPlayer, setPlaybackState, setPosition],
  );

  useEffect(() => {
    const state = usePlayerStore.getState();
    const current = state.queue[state.currentIndex];
    if (!current) return;

    const durationMs = audioStatus.duration > 0 ? Math.floor(audioStatus.duration * 1000) : current.durationMs ?? 0;
    setPosition(Math.floor(audioStatus.currentTime * 1000), durationMs);

    if (audioStatus.error) {
      if (streamRetryCountRef.current === 0 && resolvedTrackIdRef.current === current.trackId) {
        streamRetryCountRef.current = 1;
        void resolveAndPlay(current, true);
      } else {
        setPlaybackState('error');
      }
      return;
    }
    if (audioStatus.didJustFinish) {
      if (finishHandledGenerationRef.current !== generationRef.current) {
        finishHandledGenerationRef.current = generationRef.current;
        nextRef.current();
      }
      return;
    }
    if (audioStatus.isBuffering) setPlaybackState('buffering');
    else if (audioStatus.playing) setPlaybackState('playing');
    else if (audioStatus.isLoaded && state.playbackState !== 'resolving') setPlaybackState('paused');
  }, [audioStatus, resolveAndPlay, setPlaybackState, setPosition]);

  const controller = useMemo<PlayerController>(
    () => ({
      playTrack,
      play,
      pause,
      toggle,
      seekTo,
      next,
      previous,
      setQueue: setPlayerQueue,
      addNext,
      addToQueue,
      removeFromQueue,
      clearNext,
      clearQueue,
      setMode: setPlaybackMode,
    }),
    [addNext, addToQueue, clearNext, clearQueue, next, pause, play, playTrack, previous, removeFromQueue, seekTo, setPlaybackMode, setPlayerQueue, toggle],
  );

  return <PlayerContext.Provider value={controller}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerController {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used inside PlayerProvider');
  return value;
}
