import { StyleSheet, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useTheme } from '@/theme';

interface AppCardProps extends PropsWithChildren {
  variant?: 'default' | 'muted' | 'accent' | 'interactive';
}

export function AppCard({ children, variant = 'default' }: AppCardProps) {
  const { theme } = useTheme();
  const backgroundColor =
    variant === 'muted'
      ? theme.colors.surfaceMuted
      : variant === 'accent'
        ? theme.colors.primarySoft
        : theme.colors.surface;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor, borderColor: variant === 'interactive' ? theme.colors.border : 'transparent' },
        theme.shadows.card,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
});
