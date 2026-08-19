import type { Track } from '@siplayer/contracts';
import type { ReactElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchScreen from './search';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type TrackPage = { items: Track[] };
type TrackSearchState = {
  data: { pages: TrackPage[] } | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: ReturnType<typeof vi.fn>;
  refetch: ReturnType<typeof vi.fn>;
};

type FlashListProps = {
  data: Track[];
  renderItem: (info: { item: Track; index: number }) => ReactElement<{ onPress?: () => void }>;
  onEndReached?: () => void;
};

const mocks = vi.hoisted(() => ({
  player: { playTrack: vi.fn() },
  router: { push: vi.fn(), back: vi.fn(), replace: vi.fn() },
  trackSearch: {
    data: undefined as { pages: TrackPage[] } | undefined,
    isPending: false as boolean,
    isError: false as boolean,
    isFetching: false as boolean,
    hasNextPage: false as boolean,
    isFetchingNextPage: false as boolean,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  } satisfies TrackSearchState,
  catalogSearch: {
    data: undefined,
    isPending: false as boolean,
    isError: false as boolean,
    isFetching: false as boolean,
    hasNextPage: false as boolean,
    isFetchingNextPage: false as boolean,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  },
  useTrackSearch: vi.fn(),
  useCatalogSearch: vi.fn(),
  flashList: vi.fn(),
  loadSearchHistory: vi.fn(),
  recordSearchKeyword: vi.fn(),
}));

vi.mock('@shopify/flash-list', () => ({ FlashList: mocks.flashList }));
vi.mock('expo-router', () => ({ useRouter: () => mocks.router }));
vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@/api/hooks', () => ({
  useCatalogSearch: mocks.useCatalogSearch,
  useTrackSearch: mocks.useTrackSearch,
}));
vi.mock('@/components/music', () => ({ CatalogRow: 'CatalogRow', SongRow: 'SongRow' }));
vi.mock('@/components/ui', () => ({
  Button: 'Button',
  ErrorState: 'ErrorState',
  Screen: 'Screen',
  SearchField: 'SearchField',
  Skeleton: 'Skeleton',
}));
vi.mock('@/features/searchHistory', () => ({
  loadSearchHistory: mocks.loadSearchHistory,
  recordSearchKeyword: mocks.recordSearchKeyword,
}));
vi.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/player', () => ({ usePlayer: () => mocks.player }));
vi.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#000',
        surface: '#fff',
        surfaceMuted: '#eee',
        textPrimary: '#111',
        textSecondary: '#555',
      },
    },
  }),
}));

function track(id: string, playable: boolean): Track {
  return {
    id,
    name: `Track ${id}`,
    artists: [{ id: `artist-${id}`, name: 'Origin' }],
    artistText: 'Origin',
    album: null,
    artworkUrl: null,
    durationMs: 180000,
    playable,
  };
}

function findByType(renderer: ReactTestRenderer, type: string): ReactTestInstance {
  const match = renderer.root.findAll((node) => node.type === type)[0];
  if (!match) throw new Error(`Missing ${type}`);
  return match;
}

async function mountSearch(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<SearchScreen />);
  });
  return renderer;
}

function unmount(renderer: ReactTestRenderer): void {
  act(() => renderer.unmount());
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.trackSearch.data = undefined;
  mocks.trackSearch.isPending = false;
  mocks.trackSearch.isError = false;
  mocks.trackSearch.isFetching = false;
  mocks.trackSearch.hasNextPage = false;
  mocks.trackSearch.isFetchingNextPage = false;
  mocks.catalogSearch.data = undefined;
  mocks.loadSearchHistory.mockResolvedValue([]);
  mocks.recordSearchKeyword.mockResolvedValue([]);
  mocks.useTrackSearch.mockImplementation(() => mocks.trackSearch);
  mocks.useCatalogSearch.mockImplementation(() => mocks.catalogSearch);
});

describe('SearchScreen Search → Play contract', () => {
  it('passes the filtered queue and corrected index when a result is selected', async () => {
    const blocked = track('blocked', false);
    const first = track('first', true);
    const second = track('second', true);
    mocks.trackSearch.data = { pages: [{ items: [blocked, first, second] }] };
    mocks.trackSearch.hasNextPage = true;
    const renderer = await mountSearch();

    let field = findByType(renderer, 'SearchField');
    act(() => field.props.onChangeText('sky'));
    field = findByType(renderer, 'SearchField');
    await act(async () => {
      field.props.onSubmit();
      await Promise.resolve();
    });

    const flashListProps = mocks.flashList.mock.calls.at(-1)?.[0] as FlashListProps | undefined;
    if (!flashListProps) throw new Error('Missing track result list');
    expect(flashListProps.data).toEqual([blocked, first, second]);
    flashListProps.onEndReached?.();

    const resultElement = flashListProps.renderItem({ item: second, index: 2 });
    act(() => resultElement.props.onPress?.());

    expect(mocks.trackSearch.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(mocks.player.playTrack).toHaveBeenCalledWith(
      expect.objectContaining({ trackId: 'second' }),
      expect.objectContaining({
        startIndex: 1,
        queue: [expect.objectContaining({ trackId: 'first' }), expect.objectContaining({ trackId: 'second' })],
      }),
    );

    const unavailableElement = flashListProps.renderItem({ item: blocked, index: 0 });
    act(() => unavailableElement.props.onPress?.());
    expect(mocks.player.playTrack).toHaveBeenCalledTimes(1);
    unmount(renderer);
  });

  it('exposes the query error retry action after submission', async () => {
    mocks.trackSearch.isError = true;
    const renderer = await mountSearch();
    let field = findByType(renderer, 'SearchField');
    act(() => field.props.onChangeText('sky'));
    field = findByType(renderer, 'SearchField');
    await act(async () => {
      field.props.onSubmit();
      await Promise.resolve();
    });

    const errorState = findByType(renderer, 'ErrorState');
    act(() => errorState.props.onRetry());
    expect(mocks.trackSearch.refetch).toHaveBeenCalledTimes(1);
    unmount(renderer);
  });
});
