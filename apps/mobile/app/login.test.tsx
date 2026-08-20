import type { QrStartData, QrStatusData, UserProfile } from '@siplayer/contracts';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginScreen from './login';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const user: UserProfile = {
  id: 'user-1',
  nickname: 'Origin',
  avatarUrl: null,
  signature: null,
};

const qrStart: QrStartData = {
  challengeId: 'challenge-1',
  qrImageDataUrl: 'data:image/png;base64,encoded',
  expiresAt: '2026-08-19T12:00:00.000Z',
};

const mocks = vi.hoisted(() => ({
  auth: {
    isAuthenticated: false,
    isHydrating: false,
    user: null as UserProfile | null,
    startQr: vi.fn(),
    pollQr: vi.fn(),
  },
  router: { back: vi.fn() },
}));

vi.mock('expo-image', () => ({ Image: 'Image' }));
vi.mock('expo-router', () => ({ useRouter: () => mocks.router }));
vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@/auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/components/ui', () => ({
  AppCard: 'AppCard',
  Button: 'Button',
  ErrorState: 'ErrorState',
  IconButton: 'IconButton',
  Screen: 'Screen',
}));
vi.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#000',
        primarySoft: '#eee',
        surface: '#fff',
        textPrimary: '#111',
        textSecondary: '#555',
      },
      radius: { full: 999 },
      shadows: { card: {} },
      spacing: { 4: 4, 12: 12 },
    },
  }),
}));

async function mountLogin(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<LoginScreen />);
    await Promise.resolve();
  });
  return renderer;
}

function unmount(renderer: ReactTestRenderer): void {
  act(() => renderer.unmount());
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.auth.isAuthenticated = false;
  mocks.auth.isHydrating = false;
  mocks.auth.user = null;
  mocks.auth.startQr.mockResolvedValue(qrStart);
});

describe('LoginScreen QR polling contract', () => {
  it('retries a transient polling timeout without regenerating the QR code', async () => {
    mocks.auth.pollQr
      .mockRejectedValueOnce(new Error('timeout'))
      .mockImplementationOnce(async () => {
        mocks.auth.isAuthenticated = true;
        mocks.auth.user = user;
        return { status: 'AUTHORIZED', sessionToken: 'session-1', user } satisfies QrStatusData;
      });

    const renderer = await mountLogin();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(mocks.auth.startQr).toHaveBeenCalledTimes(1);
    expect(mocks.auth.pollQr).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(mocks.auth.startQr).toHaveBeenCalledTimes(1);
    expect(mocks.auth.pollQr).toHaveBeenCalledTimes(2);
    expect(renderer.root.findAll((node) => String(node.type) === 'ErrorState')).toHaveLength(0);
    expect(mocks.router.back).toHaveBeenCalledTimes(1);
    unmount(renderer);
    vi.useRealTimers();
  });
});
