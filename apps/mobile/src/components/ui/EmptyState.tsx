import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'musical-notes-outline', title, message, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft }]}>
        <Ionicons color={theme.colors.primary} name={icon} size={28} />
      </View>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction ? <Button onPress={onAction} variant="secondary">{actionLabel}</Button> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 48 },
  icon: { alignItems: 'center', borderRadius: 999, height: 64, justifyContent: 'center', width: 64 },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, maxWidth: 280, textAlign: 'center' },
});
