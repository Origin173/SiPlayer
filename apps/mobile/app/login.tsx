import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { QrStartData, QrStatusData } from '@siplayer/contracts';
import { useAuth } from '@/auth';
import { AppCard, Button, ErrorState, IconButton, Screen } from '@/components/ui';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isAuthenticated, pollQr, startQr, user } = useAuth();
  const [qr, setQr] = useState<QrStartData | null>(null);
  const [status, setStatus] = useState<QrStatusData['status'] | 'ERROR'>('WAITING_SCAN');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pollTick, setPollTick] = useState(0);

  const loadQr = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const nextQr = await startQr();
      setQr(nextQr);
      setStatus('WAITING_SCAN');
    } catch {
      setError(true);
      setStatus('ERROR');
    } finally {
      setLoading(false);
    }
  }, [startQr]);

  useEffect(() => {
    if (!isAuthenticated) void loadQr();
  }, [isAuthenticated, loadQr]);

  useEffect(() => {
    if (!qr || (status !== 'WAITING_SCAN' && status !== 'WAITING_CONFIRM')) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void pollQr(qr.challengeId).then((nextStatus) => {
        if (cancelled) return;
        setStatus(nextStatus.status);
        if (nextStatus.status === 'AUTHORIZED') router.back();
        else if (nextStatus.status === 'WAITING_SCAN' || nextStatus.status === 'WAITING_CONFIRM') setPollTick((value) => value + 1);
      }).catch(() => {
        if (!cancelled) setError(true);
      });
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pollQr, pollTick, qr, router, status]);

  return (
    <Screen>
      <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
      <View style={styles.heading}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>扫码登录</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>登录后同步你的音乐库，项目不会把网易云 Cookie 保存到手机。</Text>
      </View>
      {isAuthenticated ? (
        <AppCard variant="accent">
          <Text style={[styles.status, { color: theme.colors.textPrimary }]}>已登录</Text>
          <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>当前账号：{user?.nickname}</Text>
        </AppCard>
      ) : error ? (
        <ErrorState onRetry={() => void loadQr()} />
      ) : (
        <AppCard variant="accent">
          <View style={[styles.qrFrame, { backgroundColor: theme.colors.surface }]}>
            {qr ? <Image accessibilityLabel="网易云登录二维码" contentFit="contain" source={{ uri: qr.qrImageDataUrl }} style={styles.qrImage} /> : <ActivityIndicator color={theme.colors.primary} />}
          </View>
          <Text style={[styles.status, { color: theme.colors.textPrimary }]}>
            {loading ? '正在生成二维码…' : status === 'WAITING_CONFIRM' ? '请在手机上确认登录' : status === 'EXPIRED' ? '二维码已过期' : '请使用网易云音乐扫码'}
          </Text>
          <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>二维码和上游登录细节只在 Gateway 内部短暂保存。</Text>
          {status === 'EXPIRED' ? <Button onPress={() => void loadQr()} variant="secondary">重新生成</Button> : null}
        </AppCard>
      )}
      <Button onPress={() => router.back()} variant="secondary">稍后登录</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 8, marginBottom: 24, marginTop: 20 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  qrFrame: { alignItems: 'center', aspectRatio: 1, borderRadius: 16, justifyContent: 'center', marginBottom: 20, overflow: 'hidden', width: '100%' },
  qrImage: { height: '88%', width: '88%' },
  status: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  copy: { fontSize: 14, lineHeight: 20, marginTop: 6 },
});
