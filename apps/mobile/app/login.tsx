import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard, Button, IconButton, Screen } from '@/components/ui';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
      <View style={styles.heading}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>扫码登录</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>登录后同步你的音乐库，项目不会把网易云 Cookie 保存到手机。</Text>
      </View>
      <AppCard variant="accent">
        <View style={[styles.qrPlaceholder, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.qrMark, { color: theme.colors.primary }]}>QR</Text>
        </View>
        <Text style={[styles.status, { color: theme.colors.textPrimary }]}>二维码登录将在 Gateway Auth 切片接入</Text>
        <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>当前先完成安全的登录页面结构，不展示任何原始会话信息。</Text>
      </AppCard>
      <Button onPress={() => router.back()} variant="secondary">稍后登录</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 8, marginBottom: 24, marginTop: 20 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  qrPlaceholder: { alignItems: 'center', aspectRatio: 1, borderRadius: 16, justifyContent: 'center', marginBottom: 20, width: '100%' },
  qrMark: { fontSize: 44, fontWeight: '700', letterSpacing: 8 },
  status: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  copy: { fontSize: 14, lineHeight: 20, marginTop: 6 },
});
