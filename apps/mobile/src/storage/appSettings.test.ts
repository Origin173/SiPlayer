import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-file-system', () => ({
  File: class NativeFileShouldNotBeCreatedOnWeb {
    constructor() {
      throw new Error('native File should not be constructed on web');
    }
  },
  Paths: {
    get document() {
      throw new Error('native Paths.document should not be accessed on web');
    },
  },
}));

import { loadAppSettings, updateAppSettings } from './appSettings';

describe('app settings storage', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    });
  });

  it('uses web storage without constructing the native file object', async () => {
    await updateAppSettings({ themePreference: 'dark', quality: 'high' });

    await expect(loadAppSettings()).resolves.toEqual({ themePreference: 'dark', quality: 'high' });
  });

  it('serializes concurrent updates instead of losing fields', async () => {
    await Promise.all([
      updateAppSettings({ themePreference: 'light' }),
      updateAppSettings({ quality: 'lossless' }),
      updateAppSettings({ playbackMode: 'repeat_all' }),
    ]);

    await expect(loadAppSettings()).resolves.toEqual({
      themePreference: 'light',
      quality: 'lossless',
      playbackMode: 'repeat_all',
    });
  });
});
