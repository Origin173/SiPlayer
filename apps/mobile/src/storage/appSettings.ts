import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { AppSettingsSchema, type AppSettings } from './appSettingsModel';

export { AppSettingsSchema, ThemePreferenceSchema } from './appSettingsModel';
export type { AppSettings, ThemePreference } from './appSettingsModel';

const settingsStorageKey = 'siplayer-app-settings';

function nativeSettingsFile(): File {
  return new File(Paths.document, 'siplayer-app-settings.json');
}

function readWebSettings(): AppSettings {
  if (typeof globalThis.localStorage === 'undefined') return {};
  const raw = globalThis.localStorage.getItem(settingsStorageKey);
  if (!raw) return {};
  const result = AppSettingsSchema.safeParse(JSON.parse(raw));
  return result.success ? result.data : {};
}

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    if (Platform.OS === 'web') return readWebSettings();
    const settingsFile = nativeSettingsFile();
    if (!settingsFile.exists) return {};
    const result = AppSettingsSchema.safeParse(JSON.parse(await settingsFile.text()));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

export async function updateAppSettings(update: Partial<AppSettings>): Promise<void> {
  const current = await loadAppSettings();
  try {
    const next = AppSettingsSchema.parse({ ...current, ...update });
    if (Platform.OS === 'web') {
      if (typeof globalThis.localStorage !== 'undefined') globalThis.localStorage.setItem(settingsStorageKey, JSON.stringify(next));
      return;
    }
    const settingsFile = nativeSettingsFile();
    if (!settingsFile.exists) settingsFile.create({ overwrite: true });
    settingsFile.write(JSON.stringify(next));
  } catch {
    // Settings are a best-effort local preference and never block playback.
  }
}
