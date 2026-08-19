import type { ReactElement } from 'react';
import type { QueueItem } from '../src/player/playbackTypes';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NowPlayingScreen from './now-playing';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type PlayerState = {
  queue: QueueItem[];
  currentIndex: number;
  playbackState: 'playing' | 'paused' | 'error';
  playbackMode: 'sequential' | 'repeat_all' | 'repeat_one' | 'shuffle';
  positionMs: number;
  durationMs: number;
};

type SongRowProps = {
  isCurrent?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

type FlashListProps = {
  data: QueueItem[];
  renderItem: (info: { item: QueueItem; index: number }) => ReactElement<SongRowProps>;
  ListHeaderComponent?: ReactElement;
};

const mocks = vi.hoisted(() => ({
  player: {
    playQueueIndex: vi.fn(),
    removeFromQueue: vi.fn(),
    reorderQueue: vi.fn(),
    clearNext: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    previous: vi.fn(),
    next: vi.fn(),
    seekTo: vi.fn(),
    setMode: vi.fn(),
  },
  playerState: {
    queue: [] as QueueItem[],
    currentIndex: 1,
    playbackState: 'playing' as const,
    playbackMode: 'sequential' as const,
    positionMs: 250,
    durationMs: 1000,
  } satisfies PlayerState,
  router: { push: vi.fn(), back: vi.fn(), replace: vi.fn() },
  flashList: vi.fn(),
  likeMutation: { isPending: false, mutate: vi.fn() },
}));

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('@shopify/flash-list', () => ({ FlashList: mocks.flashList }));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => mocks.router,
}));
vi.mock('react-native', () => ({
  Modal: 'Modal',
  PanResponder: { create: () => ({ panHandlers: {} }) },
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  View: 'View',
  useWindowDimensions: () => ({ width: 390 }),
}));
vi.mock('@/api/hooks', () => ({ useTrackLike: () => mocks.likeMutation }));
vi.mock('@/auth', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock('@/components/music', () => ({ Artwork: 'Artwork', SongRow: 'SongRow' }));
vi.mock('@/components/ui', () => ({ Button: 'Button', EmptyState: 'EmptyState', IconButton: 'IconButton', Screen: 'Screen' }));
vi.mock('@/player', () => ({
  usePlayer: () => mocks.player,
  usePlayerStore: (selector: (state: PlayerState) => unknown) => selector(mocks.playerState),
}));
vi.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        danger: '#d00',
        dangerSoft: '#fee',
        divider: '#ddd',
        primary: '#00f',
        surface: '#fff',
        surfaceMuted: '#eee',
        textOnPrimary: '#fff',
        textPrimary: '#111',
        textSecondary: '#555',
        textTertiary: '#888',
      },
    },
  }),
}));
vi.mock('@/utils/formatTime', () => ({ formatTime: (value: number) => String(value) }));

function item(id: string): QueueItem {
  return {
    trackId: id,
    title: `Track ${id}`,
    artistText: 'Origin',
    artworkUrl: null,
    durationMs: 1000,
  };
}

async function mountNowPlaying(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<NowPlayingScreen />);
  });
  return renderer;
}

function unmount(renderer: ReactTestRenderer): void {
  act(() => renderer.unmount());
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.playerState.queue = [item('one'), item('two'), item('three')];
  mocks.playerState.currentIndex = 1;
  mocks.playerState.playbackState = 'playing';
  mocks.playerState.playbackMode = 'sequential';
  mocks.playerState.positionMs = 250;
  mocks.playerState.durationMs = 1000;
});

describe('NowPlayingScreen queue contract', () => {
  it('selects rows through playQueueIndex and protects the current row from removal', async () => {
    const renderer = await mountNowPlaying();
    const mainList = mocks.flashList.mock.calls[0]?.[0] as FlashListProps | undefined;
    if (!mainList) throw new Error('Missing main queue list');

    const currentRow = mainList.renderItem({ item: mocks.playerState.queue[1]!, index: 1 });
    expect(currentRow.props.isCurrent).toBe(true);
    expect(currentRow.props.onRemove).toBeUndefined();
    act(() => currentRow.props.onPress?.());
    expect(mocks.player.playQueueIndex).toHaveBeenCalledWith(1);

    const otherRow = mainList.renderItem({ item: mocks.playerState.queue[0]!, index: 0 });
    expect(otherRow.props.isCurrent).toBe(false);
    expect(otherRow.props.onRemove).toBeDefined();
    act(() => otherRow.props.onPress?.());
    act(() => otherRow.props.onRemove?.());
    expect(mocks.player.playQueueIndex).toHaveBeenCalledWith(0);
    expect(mocks.player.removeFromQueue).toHaveBeenCalledWith(0);

    act(() => currentRow.props.onMoveUp?.());
    act(() => currentRow.props.onMoveDown?.());
    expect(mocks.player.reorderQueue).toHaveBeenNthCalledWith(1, 1, 0);
    expect(mocks.player.reorderQueue).toHaveBeenNthCalledWith(2, 1, 2);
    unmount(renderer);
  });

  it('wires clear-next and modal queue selection to the player controller', async () => {
    const renderer = await mountNowPlaying();
    const mainList = mocks.flashList.mock.calls[0]?.[0] as FlashListProps | undefined;
    const header = mainList?.ListHeaderComponent;
    if (!header) throw new Error('Missing main queue header');
    let headerRenderer!: ReactTestRenderer;
    await act(async () => {
      headerRenderer = create(header);
    });
    const clearNext = headerRenderer.root.findAll((node) => String(node.type) === 'Pressable')
      .find((node) => node.props.accessibilityLabel === '清空后续歌曲');
    if (!clearNext) throw new Error('Missing clear-next action');
    act(() => clearNext.props.onPress());
    expect(mocks.player.clearNext).toHaveBeenCalledTimes(1);

    const modalList = mocks.flashList.mock.calls[1]?.[0] as FlashListProps | undefined;
    if (!modalList) throw new Error('Missing modal queue list');
    const modalRow = modalList.renderItem({ item: mocks.playerState.queue[2]!, index: 2 });
    act(() => modalRow.props.onPress?.());
    expect(mocks.player.playQueueIndex).toHaveBeenCalledWith(2);
    unmount(headerRenderer);
    unmount(renderer);
  });
});
