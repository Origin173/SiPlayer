import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { createTheme, type ThemeMode, type ThemeTokens } from './tokens';
import { loadAppSettings, updateAppSettings, type ThemePreference } from '@/storage/appSettings';

interface ThemeContextValue {
  theme: ThemeTokens;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  useEffect(() => {
    void loadAppSettings().then((settings) => {
      if (settings.themePreference) setPreference(settings.themePreference);
    });
  }, []);
  const persistPreference = useCallback((nextPreference: ThemePreference) => {
    setPreference(nextPreference);
    void updateAppSettings({ themePreference: nextPreference });
  }, []);
  const activeMode: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(
    () => ({ theme: createTheme(activeMode), preference, setPreference: persistPreference }),
    [activeMode, persistPreference, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
}
