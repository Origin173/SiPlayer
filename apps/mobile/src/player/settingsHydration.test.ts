import { describe, expect, it } from 'vitest';
import {
  canApplyHydratedSetting,
  markSettingsHydrated,
  markUserSettingOverride,
  type SettingsHydrationGuard,
} from './settingsHydration';

function createGuard(): SettingsHydrationGuard {
  return {
    hydrated: false,
    overridden: { quality: false, playbackMode: false },
  };
}

describe('player settings hydration', () => {
  it('does not let a user quality change get overwritten by stale storage', () => {
    const guard = createGuard();

    markUserSettingOverride(guard, 'quality');

    expect(canApplyHydratedSetting(guard, 'quality')).toBe(false);
    expect(canApplyHydratedSetting(guard, 'playbackMode')).toBe(true);
  });

  it('stops applying storage after hydration completes', () => {
    const guard = createGuard();

    markSettingsHydrated(guard);

    expect(canApplyHydratedSetting(guard, 'quality')).toBe(false);
    expect(canApplyHydratedSetting(guard, 'playbackMode')).toBe(false);
  });
});
