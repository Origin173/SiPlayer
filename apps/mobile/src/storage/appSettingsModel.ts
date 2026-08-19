import { AudioQualitySchema } from '@siplayer/contracts';
import { z } from 'zod';

export const ThemePreferenceSchema = z.enum(['system', 'light', 'dark']);
export const PlaybackModeSchema = z.enum(['sequential', 'repeat_all', 'repeat_one', 'shuffle']);
export const AppSettingsSchema = z.object({
  themePreference: ThemePreferenceSchema.optional(),
  playbackMode: PlaybackModeSchema.optional(),
  quality: AudioQualitySchema.optional(),
});

export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
