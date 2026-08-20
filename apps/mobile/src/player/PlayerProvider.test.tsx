import type { AudioQuality, StreamInfo, Track } from '@siplayer/contracts';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/clientCore';
import { PlayerProvider, usePlayer, type PlayerController } from './PlayerProvider';
import type { QueueItem } from './playbackTypes';
import { usePlayerStore } from './playerStore';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  audioPlayer: {
    replace: vi.fn(),
    setActiveForLockScreen: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn().mockResolvedValue(undefined),
    clearLockScreenControls: vi.fn(),
  },
  audioStatus: {
    currentTime: 0,
    duration: 0,
    playing: false,
    isBuffering: false,
    isLoaded: false,
    didJustFinish: false,
    error: null as unknown,
  },
  resolveStream: vi.fn<(trackId: string, quality: AudioQuality, signal?: AbortSignal) => Promise<StreamInfo>>(),
  loadAppSettings: vi.fn(),
  updateAppSettings: vi.fn(),
  recordLocalTrack: vi.fn(),
}));

vi.mock('expo-audio', () => ({
  setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
  useAudioPlayer: vi.fn(() => mocks.audioPlayer),
  useAudioPlayerStatus: vi.fn(() => mocks.audioStatus),
}));
vi.mock('./playbackResolver', () => ({ resolveStream: mocks.resolveStream }));
vi.mock('../features/localHistory', () => ({ recordLocalTrack: mocks.recordLocalTrack }));
vi.mock('../storage/appSettings', () => ({
  loadAppSettings: mocks.loadAppSettings,
  updateAppSettings: mocks.updateAppSettings,
}));

const track: Track = {
  id: 'track-1',
  name: 'Quiet Morning',
  artists: [{ id: 'artist-1', name: 'Origin' }],
  artistText: 'Origin',
  album: null,
  artworkUrl: 'https://img.example.com/track-1.jpg',
  durationMs: 180000,
  playable: true,
};

const item: QueueItem = {
  trackId: track.id,
  title: track.name,
  track,
  artistText: track.artistText,
  albumTitle: 'Quiet Album',
  artworkUrl: track.artworkUrl,
  durationMs: track.durationMs,
};

const secondItem: QueueItem = {
  ...item,
  trackId: 'track-2',
  title: 'Evening Tide',
};

const thirdItem: QueueItem = {
  ...item,
  trackId: 'track-3',
  title: 'Night Drive',
};

const fourthItem: QueueItem = {
  ...item,
  trackId: 'track-4',
  title: 'First Light',
};

const stream = (trackId: string): StreamInfo => ({
  trackId,
  url: `https://audio.example.com/${trackId}.mp3`,
  requestedQuality: 'auto',
  actualQuality: 'high',
});

let capturedController: PlayerController | null = null;

function ControllerCapture() {
  capturedController = usePlayer();
  return null;
}

function providerTree() {
  return (
    <PlayerProvider>
      <ControllerCapture />
    </PlayerProvider>
  );
}

async function mountProvider(): Promise<{ renderer: ReactTestRenderer; controller: PlayerController }> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(providerTree());
  });
  if (!capturedController) throw new Error('Player controller was not captured');
  return { renderer, controller: capturedController };
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function unmount(renderer: ReactTestRenderer): void {
  act(() => renderer.unmount());
}

function resetAudioStatus(): void {
  Object.assign(mocks.audioStatus, {
    currentTime: 0,
    duration: 0,
    playing: false,
    isBuffering: false,
    isLoaded: false,
    didJustFinish: false,
    error: null,
  });
}

function expectStreamResolve(trackId: string, quality: AudioQuality): void {
  expect(mocks.resolveStream).toHaveBeenCalledWith(trackId, quality, expect.any(AbortSignal));
}

beforeEach(() => {
  capturedController = null;
  usePlayerStore.getState().clear();
  usePlayerStore.setState({ playbackMode: 'sequential', quality: 'auto' });
  vi.clearAllMocks();
  mocks.resolveStream.mockReset();
  mocks.loadAppSettings.mockReset().mockResolvedValue({});
  mocks.updateAppSettings.mockReset().mockResolvedValue(undefined);
  mocks.recordLocalTrack.mockReset().mockResolvedValue(undefined);
  resetAudioStatus();
});

describe('PlayerProvider', () => {
  it('plays a selected track through resolve, metadata, and audio playback', async () => {
    mocks.resolveStream.mockResolvedValue(stream(item.trackId));
    const { renderer, controller } = await mountProvider();

    await act(async () => {
      controller.playTrack(item);
    });

    expectStreamResolve(item.trackId, 'auto');
    expect(mocks.audioPlayer.replace).toHaveBeenCalledWith({ uri: stream(item.trackId).url, name: item.title });
    expect(mocks.audioPlayer.setActiveForLockScreen).toHaveBeenCalledWith(true, {
      title: item.title,
      artist: item.artistText,
      albumTitle: item.albumTitle,
      artworkUrl: item.artworkUrl,
    });
    expect(mocks.audioPlayer.play).toHaveBeenCalledTimes(1);
    expect(usePlayerStore.getState()).toMatchObject({ currentIndex: 0, playbackState: 'loading' });
    expect(mocks.recordLocalTrack).toHaveBeenCalledWith(track);
    unmount(renderer);
  });

  it('plays an explicit queue index through the public controller contract', async () => {
    mocks.resolveStream.mockImplementation(async (trackId) => stream(trackId));
    const { renderer, controller } = await mountProvider();

    await act(async () => {
      controller.setQueue([item, secondItem], 0);
    });
    mocks.resolveStream.mockClear();
    mocks.audioPlayer.play.mockClear();

    await act(async () => {
      controller.playQueueIndex(1);
    });

    expect(usePlayerStore.getState().currentIndex).toBe(1);
    expectStreamResolve(secondItem.trackId, 'auto');
    expect(mocks.audioPlayer.play).toHaveBeenCalledTimes(1);
    unmount(renderer);
  });

  it('keeps shuffle playback unique within a round and previous follows playback history', async () => {
    mocks.resolveStream.mockImplementation(async (trackId) => stream(trackId));
    const { renderer, controller } = await mountProvider();
    const queue = [item, secondItem, thirdItem, fourthItem];

    await act(async () => controller.setQueue(queue, 0));
    act(() => controller.setMode('shuffle'));
    const playedIndexes = [usePlayerStore.getState().currentIndex];
    for (let index = 0; index < queue.length - 1; index += 1) {
      await act(async () => controller.next());
      playedIndexes.push(usePlayerStore.getState().currentIndex);
    }

    expect(new Set(playedIndexes).size).toBe(queue.length);
    const expectedPrevious = playedIndexes.at(-2);
    await act(async () => controller.previous());
    expect(usePlayerStore.getState().currentIndex).toBe(expectedPrevious);
    unmount(renderer);
  });

  it('pauses the current source before resolving a selected queue item', async () => {
    let resolveSecond!: (value: StreamInfo) => void;
    mocks.resolveStream
      .mockResolvedValueOnce(stream(item.trackId))
      .mockImplementationOnce(() => new Promise<StreamInfo>((resolve) => { resolveSecond = resolve; }));
    const { renderer, controller } = await mountProvider();

    await act(async () => {
      controller.playTrack(item, { queue: [item, secondItem], startIndex: 0 });
    });
    mocks.audioPlayer.pause.mockClear();

    act(() => controller.playQueueIndex(1));

    expect(mocks.audioPlayer.pause).toHaveBeenCalledTimes(1);
    expect(usePlayerStore.getState()).toMatchObject({ currentIndex: 1, playbackState: 'resolving' });
    resolveSecond(stream(secondItem.trackId));
    await flushPromises();
    unmount(renderer);
  });

  it('preserves position and resumes playback when changing quality', async () => {
    mocks.resolveStream.mockImplementation(async (trackId, quality) => ({ ...stream(trackId), requestedQuality: quality }));
    const { renderer, controller } = await mountProvider();

    await act(async () => controller.playTrack(item));
    usePlayerStore.setState({ positionMs: 157_000, durationMs: 180_000, playbackState: 'playing' });
    mocks.audioPlayer.pause.mockClear();
    mocks.audioPlayer.play.mockClear();
    mocks.audioPlayer.seekTo.mockClear();

    await act(async () => controller.setQuality('lossless'));

    expect(mocks.audioPlayer.pause).toHaveBeenCalledTimes(1);
    expect(mocks.audioPlayer.seekTo).toHaveBeenCalledWith(157);
    expect(mocks.audioPlayer.play).toHaveBeenCalledTimes(1);
    unmount(renderer);
  });

  it('preserves the paused state when changing quality', async () => {
    mocks.resolveStream.mockImplementation(async (trackId, quality) => ({ ...stream(trackId), requestedQuality: quality }));
    const { renderer, controller } = await mountProvider();

    await act(async () => controller.playTrack(item));
    usePlayerStore.setState({ positionMs: 157_000, durationMs: 180_000, playbackState: 'paused' });
    mocks.audioPlayer.pause.mockClear();
    mocks.audioPlayer.play.mockClear();
    mocks.audioPlayer.seekTo.mockClear();

    await act(async () => controller.setQuality('lossless'));

    expect(mocks.audioPlayer.pause).toHaveBeenCalledTimes(1);
    expect(mocks.audioPlayer.seekTo).toHaveBeenCalledWith(157);
    expect(mocks.audioPlayer.play).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().playbackState).toBe('paused');
    unmount(renderer);
  });

  it('aborts the previous stream resolve when selecting another track', async () => {
    let resolveSecond!: (value: StreamInfo) => void;
    let firstSignal: AbortSignal | undefined;
    mocks.resolveStream
      .mockImplementationOnce((_trackId, _quality, signal) => {
        firstSignal = signal;
        return new Promise<StreamInfo>(() => undefined);
      })
      .mockImplementationOnce((_trackId, _quality, signal) => {
        expect(signal?.aborted).toBe(false);
        return new Promise<StreamInfo>((resolve) => { resolveSecond = resolve; });
      });
    const { renderer, controller } = await mountProvider();

    act(() => controller.playTrack(item));
    act(() => controller.playTrack(secondItem));

    expect(firstSignal?.aborted).toBe(true);
    resolveSecond(stream(secondItem.trackId));
    await flushPromises();
    expect(mocks.audioPlayer.replace).toHaveBeenCalledWith({ uri: stream(secondItem.trackId).url, name: secondItem.title });
    unmount(renderer);
  });

  it('does not let a stale resolve replace or play a newer track', async () => {
    let resolveFirst!: (value: StreamInfo) => void;
    let resolveSecond!: (value: StreamInfo) => void;
    mocks.resolveStream.mockImplementation((trackId) => new Promise<StreamInfo>((resolve) => {
      if (trackId === item.trackId) resolveFirst = resolve;
      else resolveSecond = resolve;
    }));
    const { renderer, controller } = await mountProvider();

    act(() => controller.playTrack(item));
    act(() => controller.playTrack(secondItem));
    resolveFirst(stream(item.trackId));
    await flushPromises();

    expect(mocks.audioPlayer.replace).not.toHaveBeenCalled();
    expect(mocks.audioPlayer.play).not.toHaveBeenCalled();

    resolveSecond(stream(secondItem.trackId));
    await flushPromises();
    expect(mocks.audioPlayer.replace).toHaveBeenCalledWith({ uri: stream(secondItem.trackId).url, name: secondItem.title });
    expect(mocks.audioPlayer.play).toHaveBeenCalledTimes(1);
    unmount(renderer);
  });

  it('ignores a pending resolve after the provider unmounts', async () => {
    let resolvePending!: (value: StreamInfo) => void;
    mocks.resolveStream.mockImplementation(() => new Promise<StreamInfo>((resolve) => { resolvePending = resolve; }));
    const { renderer, controller } = await mountProvider();

    act(() => controller.playTrack(item));
    unmount(renderer);
    resolvePending(stream(item.trackId));
    await flushPromises();

    expect(mocks.audioPlayer.replace).not.toHaveBeenCalled();
    expect(mocks.audioPlayer.play).not.toHaveBeenCalled();
  });

  it('cancels a pending resolve when paused and retries failed playback', async () => {
    let resolvePending!: (value: StreamInfo) => void;
    mocks.resolveStream
      .mockImplementationOnce(() => new Promise<StreamInfo>((resolve) => { resolvePending = resolve; }))
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(stream(item.trackId));
    const { renderer, controller } = await mountProvider();

    act(() => controller.playTrack(item));
    act(() => controller.pause());
    resolvePending(stream(item.trackId));
    await flushPromises();
    expect(mocks.audioPlayer.play).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().playbackState).toBe('paused');

    await act(async () => {
      controller.play();
    });
    expect(usePlayerStore.getState().playbackState).toBe('error');
    await act(async () => {
      controller.play();
    });
    expect(mocks.audioPlayer.play).toHaveBeenCalledTimes(1);
    unmount(renderer);
  });

  it('maps unavailable errors and retries one audio failure', async () => {
    mocks.resolveStream
      .mockRejectedValueOnce(new ApiError('Unavailable', { code: 'TRACK_UNAVAILABLE', retryable: false, status: 422 }))
      .mockResolvedValueOnce(stream(item.trackId))
      .mockRejectedValueOnce(new Error('audio URL expired'));
    const { renderer, controller } = await mountProvider();

    await act(async () => {
      controller.playTrack(item);
    });
    expect(usePlayerStore.getState().playbackState).toBe('unavailable');

    await act(async () => {
      controller.play();
    });
    expect(usePlayerStore.getState().playbackState).toBe('loading');

    mocks.audioStatus = { ...mocks.audioStatus, error: true };
    await act(async () => {
      renderer.update(providerTree());
    });
    expect(mocks.resolveStream).toHaveBeenCalledTimes(3);

    await act(async () => {
      renderer.update(providerTree());
    });
    expect(mocks.resolveStream).toHaveBeenCalledTimes(3);
    expect(usePlayerStore.getState().playbackState).toBe('error');
    unmount(renderer);
  });

  it('preserves the current position when retrying an audio stream error', async () => {
    mocks.resolveStream.mockResolvedValue(stream(item.trackId));
    const { renderer, controller } = await mountProvider();

    await act(async () => controller.playTrack(item));
    usePlayerStore.setState({ positionMs: 100_000, durationMs: 180_000, playbackState: 'playing' });
    mocks.audioPlayer.seekTo.mockClear();
    mocks.audioStatus = { ...mocks.audioStatus, currentTime: 100, duration: 180, playing: true, error: null };
    await act(async () => renderer.update(providerTree()));

    mocks.audioStatus = { ...mocks.audioStatus, error: new Error('expired stream') };
    await act(async () => renderer.update(providerTree()));

    expect(mocks.resolveStream).toHaveBeenCalledTimes(2);
    expect(mocks.audioPlayer.seekTo).toHaveBeenCalledWith(100);
    expect(mocks.audioPlayer.play).toHaveBeenCalledTimes(2);
    unmount(renderer);
  });

  it('advances once on a finish edge and ignores a stale repeated status', async () => {
    mocks.resolveStream.mockImplementation(async (trackId) => stream(trackId));
    const { renderer, controller } = await mountProvider();

    await act(async () => {
      controller.playTrack(item, { queue: [item, secondItem], startIndex: 0 });
    });

    mocks.audioStatus = { ...mocks.audioStatus, didJustFinish: true };
    await act(async () => {
      renderer.update(providerTree());
    });
    expect(usePlayerStore.getState().currentIndex).toBe(1);
    expect(mocks.resolveStream).toHaveBeenNthCalledWith(2, secondItem.trackId, 'auto', expect.any(AbortSignal));
    const callsAfterFinish = mocks.resolveStream.mock.calls.length;

    await act(async () => {
      renderer.update(providerTree());
    });
    expect(mocks.resolveStream).toHaveBeenCalledTimes(callsAfterFinish);
    unmount(renderer);
  });

  it('keeps a user setting when storage hydration resolves later', async () => {
    let resolveSettings!: (value: { quality: 'standard'; playbackMode: 'repeat_all' }) => void;
    mocks.loadAppSettings.mockReturnValue(new Promise((resolve) => { resolveSettings = resolve; }));
    const { renderer, controller } = await mountProvider();

    act(() => controller.setQuality('lossless'));
    resolveSettings({ quality: 'standard', playbackMode: 'repeat_all' });
    await flushPromises();

    expect(usePlayerStore.getState().quality).toBe('lossless');
    expect(usePlayerStore.getState().playbackMode).toBe('repeat_all');
    unmount(renderer);
  });
});
