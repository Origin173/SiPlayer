export type HydratablePlayerSetting = 'quality' | 'playbackMode';

export interface SettingsHydrationGuard {
  hydrated: boolean;
  overridden: Record<HydratablePlayerSetting, boolean>;
}

export function canApplyHydratedSetting(guard: SettingsHydrationGuard, setting: HydratablePlayerSetting): boolean {
  return !guard.hydrated && !guard.overridden[setting];
}

export function markUserSettingOverride(guard: SettingsHydrationGuard, setting: HydratablePlayerSetting): void {
  if (!guard.hydrated) guard.overridden[setting] = true;
}

export function markSettingsHydrated(guard: SettingsHydrationGuard): void {
  guard.hydrated = true;
}
