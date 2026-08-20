import type { QrStartData, QrStatusData, UserProfile } from '@siplayer/contracts';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/clientCore';
import { AuthProvider, useAuth, type AuthController } from './AuthProvider';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  apiClient: { request: vi.fn() },
  queryClient: { removeQueries: vi.fn() },
  getSessionToken: vi.fn(),
  setSessionToken: vi.fn(),
  clearSessionToken: vi.fn(),
  setSessionExpiredListener: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mocks.queryClient,
}));
vi.mock('../api/client', () => ({ apiClient: mocks.apiClient }));
vi.mock('./session', () => ({
  getSessionToken: mocks.getSessionToken,
  setSessionToken: mocks.setSessionToken,
  clearSessionToken: mocks.clearSessionToken,
}));
vi.mock('./sessionEvents', () => ({ setSessionExpiredListener: mocks.setSessionExpiredListener }));

const user: UserProfile = {
  id: 'user-1',
  nickname: 'Origin',
  avatarUrl: null,
  signature: null,
};

const qrStart: QrStartData = {
  challengeId: 'challenge/1',
  qrImageDataUrl: 'data:image/png;base64,encoded',
  expiresAt: '2026-08-19T12:00:00.000Z',
};

let capturedController: AuthController | null = null;

function ControllerCapture() {
  capturedController = useAuth();
  return null;
}

function authTree() {
  return (
    <AuthProvider>
      <ControllerCapture />
    </AuthProvider>
  );
}

async function mountProvider(): Promise<{ renderer: ReactTestRenderer; controller: AuthController }> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(authTree());
  });
  if (!capturedController) throw new Error('Auth controller was not captured');
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

beforeEach(() => {
  capturedController = null;
  vi.clearAllMocks();
  mocks.apiClient.request.mockReset();
  mocks.getSessionToken.mockReset().mockResolvedValue(null);
  mocks.setSessionToken.mockReset().mockResolvedValue(undefined);
  mocks.clearSessionToken.mockReset().mockResolvedValue(undefined);
  mocks.setSessionExpiredListener.mockReset().mockReturnValue(vi.fn());
});

describe('AuthProvider', () => {
  it('hydrates as signed out without making an auth request when no session exists', async () => {
    const { renderer, controller } = await mountProvider();

    expect(controller.isHydrating).toBe(false);
    expect(controller.isAuthenticated).toBe(false);
    expect(controller.user).toBeNull();
    expect(mocks.apiClient.request).not.toHaveBeenCalled();
    unmount(renderer);
  });

  it('hydrates the current user from the project session token', async () => {
    mocks.getSessionToken.mockResolvedValue('project-session');
    mocks.apiClient.request.mockResolvedValue({ data: user, requestId: 'request-1' });
    const { renderer } = await mountProvider();

    expect(mocks.apiClient.request).toHaveBeenCalledWith('/v1/auth/me', undefined, expect.anything());
    expect(capturedController).toMatchObject({ isHydrating: false, isAuthenticated: true, user });
    unmount(renderer);
  });

  it('clears an expired session during hydration', async () => {
    mocks.getSessionToken.mockResolvedValue('expired-session');
    mocks.apiClient.request.mockRejectedValue(new ApiError('expired', {
      code: 'AUTH_EXPIRED',
      retryable: false,
      status: 401,
    }));
    const { renderer } = await mountProvider();

    expect(mocks.clearSessionToken).toHaveBeenCalledTimes(1);
    expect(mocks.queryClient.removeQueries).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(capturedController).toMatchObject({ isHydrating: false, isAuthenticated: false, user: null });
    unmount(renderer);
  });

  it('starts QR login, polls an encoded challenge, and stores an authorized session', async () => {
    const authorized: QrStatusData = { status: 'AUTHORIZED', sessionToken: 'new-session', user };
    mocks.apiClient.request
      .mockResolvedValueOnce({ data: qrStart, requestId: 'request-qr' })
      .mockResolvedValueOnce({ data: authorized, requestId: 'request-status' });
    const { renderer, controller } = await mountProvider();

    await act(async () => {
      await expect(controller.startQr()).resolves.toEqual(qrStart);
    });
    await act(async () => {
      await expect(controller.pollQr(qrStart.challengeId)).resolves.toEqual(authorized);
    });

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(1, '/v1/auth/qr/start', { method: 'POST', body: '{}' }, expect.anything());
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(2, '/v1/auth/qr/challenge%2F1', undefined, expect.anything());
    expect(mocks.setSessionToken).toHaveBeenCalledWith('new-session');
    expect(capturedController?.user).toEqual(user);
    unmount(renderer);
  });

  it('keeps the authorized session when a stale QR poll rejects afterward', async () => {
    const authorized: QrStatusData = { status: 'AUTHORIZED', sessionToken: 'new-session', user };
    let rejectStale!: (reason?: unknown) => void;
    const staleRequest = new Promise<never>((_, reject) => {
      rejectStale = reject;
    });
    mocks.apiClient.request
      .mockResolvedValueOnce({ data: authorized, requestId: 'authorized' })
      .mockReturnValueOnce(staleRequest);
    const { renderer, controller } = await mountProvider();

    const authorizedPoll = controller.pollQr('challenge-1');
    const stalePoll = controller.pollQr('challenge-1');
    await act(async () => {
      await expect(authorizedPoll).resolves.toEqual(authorized);
    });
    expect(capturedController?.isAuthenticated).toBe(true);

    rejectStale(new Error('stale timeout'));
    await expect(stalePoll).rejects.toThrow('stale timeout');
    expect(capturedController).toMatchObject({ isAuthenticated: true, user });
    unmount(renderer);
  });

  it('logs out locally even if the server logout request fails', async () => {
    mocks.getSessionToken.mockResolvedValue('project-session');
    mocks.apiClient.request
      .mockResolvedValueOnce({ data: user, requestId: 'request-me' })
      .mockRejectedValueOnce(new Error('server unavailable'));
    const { renderer, controller } = await mountProvider();

    await act(async () => {
      await controller.logout();
    });

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(2, '/v1/auth/logout', { method: 'POST', body: '{}' });
    expect(mocks.clearSessionToken).toHaveBeenCalledTimes(1);
    expect(mocks.queryClient.removeQueries).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(capturedController?.user).toBeNull();
    unmount(renderer);
  });

  it('does not update state after hydration resolves after unmount', async () => {
    mocks.getSessionToken.mockResolvedValue('project-session');
    let resolveMe!: (value: { data: UserProfile; requestId: string }) => void;
    mocks.apiClient.request.mockReturnValue(new Promise((resolve) => { resolveMe = resolve; }));
    const { renderer } = await mountProvider();

    unmount(renderer);
    resolveMe({ data: user, requestId: 'late' });
    await flushPromises();

    expect(capturedController?.user).toBeNull();
  });
});
