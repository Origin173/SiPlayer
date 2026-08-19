import { beforeEach, describe, expect, it } from 'vitest';
import type { QueueItem } from './playbackTypes';
import { usePlayerStore } from './playerStore';

const items: QueueItem[] = [
  { trackId: 'a', title: 'A', artistText: 'Artist', durationMs: 1000 },
  { trackId: 'b', title: 'B', artistText: 'Artist', durationMs: 2000 },
];

beforeEach(() => {
  usePlayerStore.getState().clear();
  usePlayerStore.setState({ playbackMode: 'sequential', quality: 'auto' });
});

describe('player store', () => {
  it('keeps an empty queue in the idle state', () => {
    usePlayerStore.getState().setQueue([], 4);
    const state = usePlayerStore.getState();

    expect(state.queue).toEqual([]);
    expect(state.currentIndex).toBe(-1);
    expect(state.playbackState).toBe('idle');
    expect(state.positionMs).toBe(0);
    expect(state.durationMs).toBe(0);
  });

  it('clamps the selected queue index and initializes the current duration', () => {
    usePlayerStore.getState().setQueue(items, 99);
    const state = usePlayerStore.getState();

    expect(state.currentIndex).toBe(1);
    expect(state.playbackState).toBe('paused');
    expect(state.durationMs).toBe(2000);
  });

  it('preserves progress metadata while changing playback state', () => {
    usePlayerStore.getState().setQueue(items, 0);
    usePlayerStore.getState().setPosition(450, 1000);
    usePlayerStore.getState().setPlaybackState('playing');
    const state = usePlayerStore.getState();

    expect(state.playbackState).toBe('playing');
    expect(state.positionMs).toBe(450);
    expect(state.durationMs).toBe(1000);
  });

  it('clears queue and playback metadata together', () => {
    usePlayerStore.getState().setQueue(items, 1);
    usePlayerStore.getState().setPosition(700, 2000);
    usePlayerStore.getState().setPlaybackState('playing');
    usePlayerStore.getState().clear();

    expect(usePlayerStore.getState()).toMatchObject({
      queue: [],
      currentIndex: -1,
      playbackState: 'idle',
      positionMs: 0,
      durationMs: 0,
    });
  });
});
