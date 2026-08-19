import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { AudioQuality } from '@siplayer/contracts';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type PropsWithChildren } from 'react';
import { recordLocalTrack } from '../features/localHistory';
import { loadAppSettings, updateAppSettings } from '../storage/appSettings';
import { resolveStream } from './playbackResolver';
import { isNewAudioError, isNewAudioFinish, resolveAndPlayTrack, shouldHandleAudioStatus } from './playbackRuntime';
import { canApplyHydratedSetting, markSettingsHydrated, markUserSettingOverride, type SettingsHydrationGuard } from './settingsHydration';
import { nextQueueIndex } from './playbackModes';
import type { PlayContext, PlaybackMode, QueueItem } from './playbackTypes';
import { usePlayerStore } from './playerStore';

export interface PlayerController {
  playTrack: (track: QueueItem, context?: PlayContext) => void;
  playQueueIndex: (index: number) => void;
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
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearNext: () => void;
  clearQueue: () => void;
  setMode: (mode: PlaybackMode) => void;
  setQuality: (quality: AudioQuality) => void;
}

const PlayerContext = createContext<PlayerController | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const audioPlayer = useAudioPlayer(null, { updateInterval: 500, keepAudioSessionActive: true });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const replaceQueue = usePlayerStore((state) => state.replaceQueue);
  const mutateQueue = usePlayerStore((state) => state.mutateQueue);
  const reorderQueue = usePlayerStore((state) => state.reorderQueue);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);
  const setPlaybackMode = usePlayerStore((state) => state.setPlaybackMode);
  const setPlaybackQuality = usePlayerStore((state) => state.setQuality);
  const setPosition = usePlayerStore((state) => state.setPosition);
  const setCurrentIndex = usePlayerStore((state) => state.setCurrentIndex);
  const clear = usePlayerStore((state) => state.clear);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const resolveAbortControllerRef = useRef<AbortController | null>(null);
  const resolvedTrackIdRef = useRef<string | null>(null);
  const streamRetryCountRef = useRef(0);
  const audioErrorRef = useRef(false);
  const didJustFinishRef = useRef(false);
  const nextRef = useRef<() => void>(() => undefined);
  const settingsHydrationRef = useRef<SettingsHydrationGuard>({
    hydrated: false,
    overridden: { quality: false, playbackMode: false },
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      resolveAbortControllerRef.current?.abort();
      resolveAbortControllerRef.current = null;
      resolvedTrackIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadAppSettings().then((settings) => {
      if (cancelled) return;
      const guard = settingsHydrationRef.current;
      if (settings.playbackMode && canApplyHydratedSetting(guard, 'playbackMode')) setPlaybackMode(settings.playbackMode);
      if (settings.quality && canApplyHydratedSetting(guard, 'quality')) setPlaybackQuality(settings.quality);
      markSettingsHydrated(guard);
    });
    return () => {
      cancelled = true;
    };
  }, [setPlaybackMode, setPlaybackQuality]);

  const resolveAndPlay = useCallback(
    async (item: QueueItem, isRetry = false, transition: { positionMs?: number; autoPlay?: boolean } = {}) => {
      const generation = ++generationRef.current;
      resolveAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      resolveAbortControllerRef.current = abortController;
      if (!isRetry) streamRetryCountRef.current = 0;
      resolvedTrackIdRef.current = null;

      try {
        const result = await resolveAndPlayTrack({
          item,
          quality: usePlayerStore.getState().quality,
          isRetry,
          resolve: (trackId, quality, signal) => resolveStream(trackId, quality, signal),
          signal: abortController.signal,
          isCurrent: () => mountedRef.current && generation === generationRef.current,
          audio: {
            replace: (source) => audioPlayer.replace(source),
            seekTo: (positionMs) => audioPlayer.seekTo(positionMs / 1000),
            setActiveForLockScreen: (active, metadata) => audioPlayer.setActiveForLockScreen(active, metadata),
            play: () => audioPlayer.play(),
          },
          setPlaybackState,
          ...transition,
          onStarted: () => {
            resolvedTrackIdRef.current = item.trackId;
            if (!isRetry && item.track) void recordLocalTrack(item.track);
          },
        });

        if (result.status === 'failed') resolvedTrackIdRef.current = null;
      } finally {
        if (resolveAbortControllerRef.current === abortController) resolveAbortControllerRef.current = null;
      }
    },
    [audioPlayer, setPlaybackState],
  );

  const goToIndex = useCallback(
    (index: number, items = usePlayerStore.getState().queue) => {
      const item = items[index];
      if (!item) return;
      audioPlayer.pause();
      setCurrentIndex(index);
      void resolveAndPlay(item);
    },
    [audioPlayer, resolveAndPlay, setCurrentIndex],
  );

  const playQueueIndex = useCallback((index: number) => {
    goToIndex(index);
  }, [goToIndex]);

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
    const state = usePlayerStore.getState();
    if (state.queue.length === 0) return;
    if (state.playbackState === 'resolving') {
      generationRef.current += 1;
      resolveAbortControllerRef.current?.abort();
      resolveAbortControllerRef.current = null;
      resolvedTrackIdRef.current = null;
    }
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
      audioPlayer.pause();
      replaceQueue(items, startIndex);
      const safeIndex = items.length > 0 ? Math.min(Math.max(startIndex, 0), items.length - 1) : -1;
      const item = items[safeIndex];
      if (item) void resolveAndPlay(item);
    },
    [audioPlayer, replaceQueue, resolveAndPlay],
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
      mutateQueue(nextQueue, state.currentIndex < 0 ? 0 : state.currentIndex);
    },
    [mutateQueue],
  );

  const addToQueue = useCallback(
    (item: QueueItem) => {
      const state = usePlayerStore.getState();
      mutateQueue([...state.queue, item], state.currentIndex < 0 ? 0 : state.currentIndex);
    },
    [mutateQueue],
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
      if (index === state.currentIndex) audioPlayer.pause();
      mutateQueue(nextQueue, Math.max(nextIndex, 0));
      if (index === state.currentIndex) {
        const nextItem = nextQueue[Math.max(nextIndex, 0)];
        if (nextItem) void resolveAndPlay(nextItem);
      } else {
      }
    },
    [audioPlayer, clear, mutateQueue, resolveAndPlay],
  );

  const clearNext = useCallback(() => {
    const state = usePlayerStore.getState();
    if (state.currentIndex < 0 || state.currentIndex >= state.queue.length - 1) return;
    const nextQueue = state.queue.slice(0, state.currentIndex + 1);
    mutateQueue(nextQueue, state.currentIndex);
  }, [mutateQueue]);

  const clearQueue = useCallback(() => {
    generationRef.current += 1;
    resolveAbortControllerRef.current?.abort();
    resolveAbortControllerRef.current = null;
    resolvedTrackIdRef.current = null;
    clear();
    audioPlayer.pause();
    audioPlayer.clearLockScreenControls();
  }, [audioPlayer, clear]);

  const setQuality = useCallback(
    (quality: AudioQuality) => {
      markUserSettingOverride(settingsHydrationRef.current, 'quality');
      setPlaybackQuality(quality);
      void updateAppSettings({ quality });
      const state = usePlayerStore.getState();
      const item = state.queue[state.currentIndex];
      if (item) {
        const autoPlay = state.playbackState === 'playing' || state.playbackState === 'buffering' || state.playbackState === 'loading';
        audioPlayer.pause();
        void resolveAndPlay(item, false, { positionMs: state.positionMs, autoPlay });
      }
    },
    [audioPlayer, resolveAndPlay, setPlaybackQuality],
  );

  const setMode = useCallback((mode: PlaybackMode) => {
    markUserSettingOverride(settingsHydrationRef.current, 'playbackMode');
    setPlaybackMode(mode);
    void updateAppSettings({ playbackMode: mode });
  }, [setPlaybackMode]);

  const seekTo = useCallback(
    (positionMs: number) => {
      const nextPosition = Math.max(positionMs, 0);
      setPosition(nextPosition);
      void audioPlayer.seekTo(nextPosition / 1000).catch(() => setPlaybackState('error'));
    },
    [audioPlayer, setPlaybackState, setPosition],
  );

  useEffect(() => {
    const hasAudioError = Boolean(audioStatus.error);
    const justErrored = isNewAudioError(hasAudioError, audioErrorRef.current);
    audioErrorRef.current = hasAudioError;
    const justFinished = isNewAudioFinish(audioStatus.didJustFinish, didJustFinishRef.current);
    didJustFinishRef.current = audioStatus.didJustFinish;
    const state = usePlayerStore.getState();
    const current = state.queue[state.currentIndex];
    if (!current || !shouldHandleAudioStatus(current.trackId, resolvedTrackIdRef.current)) return;

    const durationMs = audioStatus.duration > 0 ? Math.floor(audioStatus.duration * 1000) : current.durationMs ?? 0;
    setPosition(Math.floor(audioStatus.currentTime * 1000), durationMs);

    if (hasAudioError) {
      if (!justErrored) return;
      if (streamRetryCountRef.current === 0 && resolvedTrackIdRef.current === current.trackId) {
        streamRetryCountRef.current = 1;
        void resolveAndPlay(current, true);
      } else {
        setPlaybackState('error');
      }
      return;
    }
    if (audioStatus.didJustFinish) {
      if (justFinished) nextRef.current();
      return;
    }
    if (audioStatus.isBuffering) setPlaybackState('buffering');
    else if (audioStatus.playing) setPlaybackState('playing');
    else if (audioStatus.isLoaded && state.playbackState !== 'resolving') setPlaybackState('paused');
  }, [audioStatus, resolveAndPlay, setPlaybackState, setPosition]);

  const controller = useMemo<PlayerController>(
    () => ({
      playTrack,
      playQueueIndex,
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
      reorderQueue,
      clearNext,
      clearQueue,
      setMode,
      setQuality,
    }),
    [addNext, addToQueue, clearNext, clearQueue, next, pause, play, playQueueIndex, playTrack, previous, removeFromQueue, reorderQueue, seekTo, setMode, setPlayerQueue, setQuality, toggle],
  );

  return <PlayerContext.Provider value={controller}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerController {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used inside PlayerProvider');
  return value;
}
