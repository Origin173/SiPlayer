import { File, Paths } from 'expo-file-system';
import { AppSettingsSchema, type AppSettings } from './appSettingsModel';

export { AppSettingsSchema, ThemePreferenceSchema } from './appSettingsModel';
export type { AppSettings, ThemePreference } from './appSettingsModel';

const settingsFile = new File(Paths.document, 'siplayer-app-settings.json');

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    if (!settingsFile.exists) return {};
    const parsed: unknown = JSON.parse(await settingsFile.text());
    const result = AppSettingsSchema.safeParse(parsed);
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

export async function updateAppSettings(update: Partial<AppSettings>): Promise<void> {
  const current = await loadAppSettings();
  const next = AppSettingsSchema.parse({ ...current, ...update });
  try {
    if (!settingsFile.exists) settingsFile.create({ overwrite: true });
    settingsFile.write(JSON.stringify(next));
  } catch {
    // Settings are a best-effort local preference and never block playback.
  }
}
