import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { QrStartData } from '@siplayer/contracts';
import { useAuth } from '@/auth';
import { AppCard, Button, ErrorState, IconButton, Screen } from '@/components/ui';
import { useTheme } from '@/theme';

export type LoginState =
  | 'LOADING_QR'
  | 'WAITING_SCAN'
  | 'WAITING_CONFIRM'
  | 'AUTHORIZED'
  | 'EXPIRED'
  | 'TRANSIENT_ERROR'
  | 'FATAL_ERROR';

const INITIAL_POLL_DELAY_MS = 2_000;
const RETRY_BASE_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 8_000;

function retryDelayMs(attempt: number): number {
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1), MAX_RETRY_DELAY_MS);
}

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isAuthenticated, isHydrating, pollQr, startQr, user } = useAuth();
  const [qr, setQr] = useState<QrStartData | null>(null);
  const [loginState, setLoginState] = useState<LoginState>('LOADING_QR');
  const [loading, setLoading] = useState(false);
  const [pollTick, setPollTick] = useState(0);
  const authorizedRef = useRef(false);
  const pollGenerationRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const loadQr = useCallback(async () => {
    const generation = ++pollGenerationRef.current;
    authorizedRef.current = false;
    retryAttemptRef.current = 0;
    clearPollTimer();
    setQr(null);
    setLoading(true);
    setLoginState('LOADING_QR');
    try {
      const nextQr = await startQr();
      if (generation !== pollGenerationRef.current || authorizedRef.current) return;
      setQr(nextQr);
      setLoginState('WAITING_SCAN');
    } catch {
      if (generation === pollGenerationRef.current && !authorizedRef.current) setLoginState('FATAL_ERROR');
    } finally {
      if (generation === pollGenerationRef.current) setLoading(false);
    }
  }, [clearPollTimer, startQr]);

  useEffect(() => {
    if (!isHydrating && !isAuthenticated) void loadQr();
  }, [isAuthenticated, isHydrating, loadQr]);

  useEffect(() => {
    if (isAuthenticated) {
      authorizedRef.current = true;
      pollGenerationRef.current += 1;
      clearPollTimer();
      router.back();
    }
  }, [clearPollTimer, isAuthenticated, router]);

  useEffect(() => {
    const isPollingState = loginState === 'WAITING_SCAN' || loginState === 'WAITING_CONFIRM' || loginState === 'TRANSIENT_ERROR';
    if (!qr || isAuthenticated || authorizedRef.current || !isPollingState) return;

    const generation = pollGenerationRef.current;
    let cancelled = false;
    const delayMs = loginState === 'TRANSIENT_ERROR'
      ? retryDelayMs(retryAttemptRef.current)
      : INITIAL_POLL_DELAY_MS;
    const timer = setTimeout(() => {
      void pollQr(qr.challengeId).then((nextStatus) => {
        if (cancelled || generation !== pollGenerationRef.current || authorizedRef.current) return;

        if (nextStatus.status === 'AUTHORIZED') {
          authorizedRef.current = true;
          clearPollTimer();
          setLoginState('AUTHORIZED');
          return;
        }

        retryAttemptRef.current = 0;
        setLoginState(nextStatus.status);
        setPollTick((value) => value + 1);
      }).catch(() => {
        if (cancelled || generation !== pollGenerationRef.current || authorizedRef.current) return;
        retryAttemptRef.current += 1;
        setLoginState('TRANSIENT_ERROR');
        setPollTick((value) => value + 1);
      });
    }, delayMs);
    pollTimerRef.current = timer;
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (pollTimerRef.current === timer) pollTimerRef.current = null;
    };
  }, [clearPollTimer, isAuthenticated, loginState, pollQr, pollTick, qr]);

  const statusText = loading
    ? '正在生成二维码…'
    : loginState === 'WAITING_CONFIRM'
      ? '请在手机上确认登录'
      : loginState === 'TRANSIENT_ERROR'
        ? '网络连接不稳定，正在重试…'
        : loginState === 'AUTHORIZED' || isAuthenticated
          ? '登录成功，正在进入…'
          : loginState === 'EXPIRED'
            ? '二维码已过期'
            : '请使用网易云音乐扫码';

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
      ) : loginState === 'FATAL_ERROR' ? (
        <ErrorState onRetry={() => void loadQr()} />
      ) : (
        <AppCard variant="accent">
          <View style={[styles.qrFrame, { backgroundColor: theme.colors.surface }]}>
            {qr ? <Image accessibilityLabel="网易云登录二维码" contentFit="contain" source={{ uri: qr.qrImageDataUrl }} style={styles.qrImage} /> : <ActivityIndicator color={theme.colors.primary} />}
          </View>
          <Text style={[styles.status, { color: theme.colors.textPrimary }]}>
            {statusText}
          </Text>
          <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>二维码和上游登录细节只在 Gateway 内部短暂保存。</Text>
          {loginState === 'EXPIRED' ? <Button onPress={() => void loadQr()} variant="secondary">重新生成</Button> : null}
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
