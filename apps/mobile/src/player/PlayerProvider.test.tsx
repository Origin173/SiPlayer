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
  resolveStream: vi.fn<(trackId: string, quality: AudioQuality) => Promise<StreamInfo>>(),
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

    expect(mocks.resolveStream).toHaveBeenCalledWith(item.trackId, 'auto');
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
    expect(mocks.resolveStream).toHaveBeenCalledWith(secondItem.trackId, 'auto');
    expect(mocks.audioPlayer.play).toHaveBeenCalledTimes(1);
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
    expect(mocks.resolveStream).toHaveBeenCalledWith(secondItem.trackId, 'auto');
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
