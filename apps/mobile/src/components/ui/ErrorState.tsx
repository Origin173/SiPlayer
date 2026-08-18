import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = '网络连接不稳定', message = '暂时无法加载内容，请稍后重试。', onRetry }: ErrorStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
      {onRetry ? <Button onPress={onRetry} variant="secondary">重试</Button> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  title: { fontSize: 17, fontWeight: '700' },
  message: { fontSize: 14, lineHeight: 20, maxWidth: 280, textAlign: 'center' },
});
