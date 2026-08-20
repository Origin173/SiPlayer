import { beforeEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ OS: 'native' as string }));
const secureStore = {
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
};

vi.mock('expo-secure-store', () => secureStore);
vi.mock('react-native', () => ({ Platform: platform }));

describe('session storage contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    platform.OS = 'native';
    secureStore.getItemAsync.mockResolvedValue(null);
    secureStore.setItemAsync.mockResolvedValue(undefined);
    secureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  it('caches a successful read for the current app session', async () => {
    secureStore.getItemAsync.mockResolvedValue('session-1');
    const { getSessionToken } = await import('./session');

    await expect(getSessionToken()).resolves.toBe('session-1');
    await expect(getSessionToken()).resolves.toBe('session-1');
    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it('treats an unavailable storage backend as an anonymous session', async () => {
    secureStore.getItemAsync.mockRejectedValue(new Error('SecureStore unavailable'));
    const { getSessionToken } = await import('./session');

    await expect(getSessionToken()).resolves.toBeNull();
    await expect(getSessionToken()).resolves.toBeNull();
    expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it('clears the in-memory token even when storage deletion fails', async () => {
    secureStore.getItemAsync.mockResolvedValue('session-1');
    secureStore.deleteItemAsync.mockRejectedValue(new Error('SecureStore unavailable'));
    const { clearSessionToken, getSessionToken } = await import('./session');

    await expect(getSessionToken()).resolves.toBe('session-1');
    await expect(clearSessionToken()).rejects.toThrow('SecureStore unavailable');
    await expect(getSessionToken()).resolves.toBeNull();
  });

  it('uses sessionStorage for Web sessions instead of SecureStore', async () => {
    platform.OS = 'web';
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal('sessionStorage', storage);
    const { getSessionToken, setSessionToken } = await import('./session');

    await setSessionToken('web-session');

    expect(storage.setItem).toHaveBeenCalledWith('siplayer.sessionToken', 'web-session');
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    await expect(getSessionToken()).resolves.toBe('web-session');
  });
});
