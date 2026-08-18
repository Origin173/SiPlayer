import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = true, contentContainerStyle }: ScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const contentStyle = [
    styles.content,
    {
      backgroundColor: theme.colors.background,
      paddingTop: insets.top + theme.spacing[4],
      paddingBottom: insets.bottom + theme.spacing[12],
    },
    contentContainerStyle,
  ];

  if (!scroll) {
    return <View style={[styles.root, { backgroundColor: theme.colors.background }, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20 },
});
