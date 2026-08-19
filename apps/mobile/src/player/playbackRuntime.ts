import type { AudioQuality, StreamInfo } from '@siplayer/contracts';
import { ApiError } from '../api/clientCore';
import type { PlaybackState, QueueItem } from './playbackTypes';

export interface PlaybackAudioEngine {
  replace: (source: { uri: string; name: string }) => void;
  seekTo?: (positionMs: number) => void | Promise<void>;
  setActiveForLockScreen: (active: boolean, metadata: {
    title: string;
    artist: string;
    albumTitle?: string;
    artworkUrl?: string;
  }) => void;
  play: () => void;
}

export interface ResolveAndPlayOptions {
  item: QueueItem;
  quality: AudioQuality;
  isRetry: boolean;
  resolve: (trackId: string, quality: AudioQuality, signal?: AbortSignal) => Promise<StreamInfo>;
  signal?: AbortSignal;
  isCurrent: () => boolean;
  audio: PlaybackAudioEngine;
  setPlaybackState: (state: PlaybackState) => void;
  positionMs?: number;
  autoPlay?: boolean;
  onStarted?: () => void;
}

export type ResolveAndPlayResult =
  | { status: 'played' }
  | { status: 'stale' }
  | { status: 'failed'; playbackState: 'error' | 'unavailable' };

export async function resolveAndPlayTrack(options: ResolveAndPlayOptions): Promise<ResolveAndPlayResult> {
  options.setPlaybackState('resolving');

  try {
    const stream = await options.resolve(options.item.trackId, options.quality, options.signal);
    if (!options.isCurrent()) return { status: 'stale' };

    options.audio.replace({ uri: stream.url, name: options.item.title });
    options.audio.setActiveForLockScreen(true, {
      title: options.item.title,
      artist: options.item.artistText,
      ...(options.item.albumTitle ? { albumTitle: options.item.albumTitle } : {}),
      ...(options.item.artworkUrl ? { artworkUrl: options.item.artworkUrl } : {}),
    });
    options.onStarted?.();
    options.setPlaybackState('loading');
    if (options.positionMs && options.audio.seekTo) {
      await options.audio.seekTo(options.positionMs);
    }
    if (options.autoPlay === false) {
      options.setPlaybackState('paused');
    } else {
      options.audio.play();
    }
    return { status: 'played' };
  } catch (error) {
    if (!options.isCurrent()) return { status: 'stale' };
    const playbackState = error instanceof ApiError && error.code === 'TRACK_UNAVAILABLE' ? 'unavailable' : 'error';
    options.setPlaybackState(playbackState);
    return { status: 'failed', playbackState };
  }
}

export function shouldHandleAudioStatus(currentTrackId: string, resolvedTrackId: string | null): boolean {
  return resolvedTrackId === currentTrackId;
}

export function isNewAudioFinish(didJustFinish: boolean, previouslyDidJustFinish: boolean): boolean {
  return didJustFinish && !previouslyDidJustFinish;
}

export function isNewAudioError(hasError: boolean, previouslyHadError: boolean): boolean {
  return hasError && !previouslyHadError;
}
