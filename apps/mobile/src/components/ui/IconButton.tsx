import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';
import type { ComponentProps } from 'react';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconButtonProps {
  name: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  size?: 40 | 44 | 52 | 60;
  iconSize?: number;
  color?: string;
  disabled?: boolean;
}

export function IconButton({
  name,
  accessibilityLabel,
  onPress,
  size = 44,
  iconSize = 22,
  color,
  disabled = false,
}: IconButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: theme.radius.full,
          backgroundColor: pressed ? theme.colors.primarySoft : 'transparent',
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Ionicons color={color ?? theme.colors.textPrimary} name={name} size={iconSize} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
});
