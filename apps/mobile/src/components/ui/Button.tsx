import { Pressable, StyleSheet, Text } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useTheme } from '@/theme';

interface ButtonProps extends PropsWithChildren {
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  accessibilityLabel?: string;
  disabled?: boolean;
}

export function Button({ children, onPress, variant = 'primary', accessibilityLabel, disabled = false }: ButtonProps) {
  const { theme } = useTheme();
  const isPrimary = variant === 'primary';
  const isText = variant === 'text';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => {
        const backgroundColor = isPrimary
          ? pressed
            ? theme.colors.primaryPressed
            : theme.colors.primary
          : isText
            ? 'transparent'
            : pressed
              ? theme.colors.border
              : theme.colors.surfaceMuted;
        return [
          styles.button,
          {
            backgroundColor,
            borderColor: isPrimary || isText ? 'transparent' : theme.colors.border,
            borderWidth: isPrimary || isText ? 0 : 1,
            opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
          },
          isText && styles.textButton,
        ];
      }}
    >
      <Text style={[styles.label, { color: isPrimary ? theme.colors.textOnPrimary : theme.colors.textPrimary }]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
  },
  textButton: { paddingHorizontal: 8 },
  label: { fontSize: 15, fontWeight: '600' },
});
