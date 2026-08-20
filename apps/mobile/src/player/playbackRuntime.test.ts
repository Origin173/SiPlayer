import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/clientCore';
import type { StreamInfo } from '@siplayer/contracts';
import type { QueueItem } from './playbackTypes';
import { clampPositionMs, isNewAudioError, isNewAudioFinish, resolveAndPlayTrack, shouldHandleAudioStatus, type PlaybackAudioEngine } from './playbackRuntime';

const item: QueueItem = {
  trackId: 'track-1',
  title: 'Quiet Morning',
  artistText: 'Origin',
  albumTitle: 'Quiet Album',
  artworkUrl: 'https://img.example.com/track-1.jpg',
};

const stream: StreamInfo = {
  trackId: item.trackId,
  url: 'https://audio.example.com/track-1.mp3',
  requestedQuality: 'high',
  actualQuality: 'high',
};

function createAudio(): PlaybackAudioEngine {
  return {
    replace: vi.fn(),
    setActiveForLockScreen: vi.fn(),
    play: vi.fn(),
  };
}

describe('playback runtime', () => {
  it('clamps seek positions to the known duration', () => {
    expect(clampPositionMs(-1, 180_000)).toBe(0);
    expect(clampPositionMs(90_000, 180_000)).toBe(90_000);
    expect(clampPositionMs(200_000, 180_000)).toBe(180_000);
    expect(clampPositionMs(200_000, 0)).toBe(200_000);
  });

  it('resolves a stream, updates lock-screen metadata, and starts playback', async () => {
    const audio = createAudio();
    const states: string[] = [];
    const onStarted = vi.fn();

    await expect(resolveAndPlayTrack({
      item,
      quality: 'high',
      isRetry: false,
      resolve: vi.fn().mockResolvedValue(stream),
      isCurrent: () => true,
      audio,
      setPlaybackState: (state) => states.push(state),
      onStarted,
    })).resolves.toEqual({ status: 'played' });

    expect(states).toEqual(['resolving', 'loading']);
    expect(audio.replace).toHaveBeenCalledWith({ uri: stream.url, name: item.title });
    expect(audio.setActiveForLockScreen).toHaveBeenCalledWith(true, {
      title: item.title,
      artist: item.artistText,
      albumTitle: item.albumTitle,
      artworkUrl: item.artworkUrl,
    });
    expect(onStarted).toHaveBeenCalledTimes(1);
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it('ignores a stream that resolves after the request became stale', async () => {
    const audio = createAudio();
    let current = true;
    let finish!: (value: StreamInfo) => void;
    const resolve = vi.fn(() => new Promise<StreamInfo>((resolvePromise) => { finish = resolvePromise; }));
    const setPlaybackState = vi.fn();

    const request = resolveAndPlayTrack({
      item,
      quality: 'auto',
      isRetry: false,
      resolve,
      isCurrent: () => current,
      audio,
      setPlaybackState,
    });
    current = false;
    finish(stream);

    await expect(request).resolves.toEqual({ status: 'stale' });
    expect(audio.replace).not.toHaveBeenCalled();
    expect(audio.play).not.toHaveBeenCalled();
    expect(setPlaybackState).toHaveBeenCalledWith('resolving');
  });

  it('maps an unavailable track separately from other resolve failures', async () => {
    const unavailable = new ApiError('Unavailable', { code: 'TRACK_UNAVAILABLE', retryable: false, status: 422 });
    const audio = createAudio();
    const setPlaybackState = vi.fn();

    await expect(resolveAndPlayTrack({
      item,
      quality: 'auto',
      isRetry: false,
      resolve: vi.fn().mockRejectedValue(unavailable),
      isCurrent: () => true,
      audio,
      setPlaybackState,
    })).resolves.toEqual({ status: 'failed', playbackState: 'unavailable' });
    expect(setPlaybackState).toHaveBeenLastCalledWith('unavailable');

    await expect(resolveAndPlayTrack({
      item,
      quality: 'auto',
      isRetry: true,
      resolve: vi.fn().mockRejectedValue(new Error('network down')),
      isCurrent: () => true,
      audio,
      setPlaybackState,
    })).resolves.toEqual({ status: 'failed', playbackState: 'error' });
    expect(setPlaybackState).toHaveBeenLastCalledWith('error');
  });

  it('only treats audio status as belonging to the currently resolved track', () => {
    expect(shouldHandleAudioStatus('track-1', 'track-1')).toBe(true);
    expect(shouldHandleAudioStatus('track-2', 'track-1')).toBe(false);
    expect(shouldHandleAudioStatus('track-1', null)).toBe(false);
  });

  it('handles a didJustFinish edge only once until the status resets', () => {
    expect(isNewAudioFinish(true, false)).toBe(true);
    expect(isNewAudioFinish(true, true)).toBe(false);
    expect(isNewAudioFinish(false, true)).toBe(false);
  });

  it('handles an audio error edge only once until the status resets', () => {
    expect(isNewAudioError(true, false)).toBe(true);
    expect(isNewAudioError(true, true)).toBe(false);
    expect(isNewAudioError(false, true)).toBe(false);
  });
});
