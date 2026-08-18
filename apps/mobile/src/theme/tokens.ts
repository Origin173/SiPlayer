export const lightColors = {
  background: '#F6F7FB',
  backgroundElevated: '#FAFAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F2F6',
  textPrimary: '#17181C',
  textSecondary: '#666B76',
  textTertiary: '#969BA6',
  textOnPrimary: '#FFFFFF',
  primary: '#6C5CE7',
  primaryPressed: '#5C4ED0',
  primarySoft: '#F0EEFD',
  success: '#2ECC71',
  successSoft: '#E8F8EE',
  warning: '#FF9F43',
  warningSoft: '#FFF4E8',
  danger: '#FF5C7A',
  dangerSoft: '#FFF0F3',
  border: '#E8E9EE',
  divider: '#F0F1F4',
  overlay: 'rgba(16, 18, 24, 0.42)',
} as const;

export const darkColors = {
  background: '#0F1014',
  backgroundElevated: '#14161B',
  surface: '#191B21',
  surfaceMuted: '#22252D',
  textPrimary: '#F6F7FA',
  textSecondary: '#B6BAC4',
  textTertiary: '#7E838E',
  textOnPrimary: '#FFFFFF',
  primary: '#8B7CF6',
  primaryPressed: '#9A8CF8',
  primarySoft: '#292445',
  success: '#48D984',
  successSoft: '#173324',
  warning: '#FFAD5C',
  warningSoft: '#3A2B19',
  danger: '#FF718A',
  dangerSoft: '#3D1E25',
  border: '#2A2D35',
  divider: '#24272E',
  overlay: 'rgba(0, 0, 0, 0.58)',
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: '700', lineHeight: 36 },
  pageTitle: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  title: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  secondary: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '400', lineHeight: 15 },
  metric: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#17181C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 1,
  },
  floating: {
    shadowColor: '#17181C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
} as const;

export type ColorTokens = { [Key in keyof typeof lightColors]: string };
export type ThemeMode = 'light' | 'dark';
export type ThemeTokens = {
  mode: ThemeMode;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
};

export function createTheme(mode: ThemeMode): ThemeTokens {
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    typography,
    shadows,
  };
}
