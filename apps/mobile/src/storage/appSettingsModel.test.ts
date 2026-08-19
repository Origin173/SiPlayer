import { describe, expect, it } from 'vitest';
import { AppSettingsSchema } from './appSettingsModel';

describe('app settings model', () => {
  it('accepts only serializable supported preferences', () => {
    expect(AppSettingsSchema.parse({ themePreference: 'dark', playbackMode: 'repeat_one', quality: 'lossless' })).toEqual({
      themePreference: 'dark',
      playbackMode: 'repeat_one',
      quality: 'lossless',
    });
  });

  it('rejects unknown settings values', () => {
    expect(AppSettingsSchema.safeParse({ quality: 'source-cookie' }).success).toBe(false);
  });
});
