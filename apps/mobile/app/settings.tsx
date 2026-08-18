import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HealthDataSchema, type AudioQuality } from '@siplayer/contracts';
import type { ReactNode } from 'react';
import { useAuth } from '@/auth';
import { apiClient } from '@/api/client';
import { Button, IconButton, Screen } from '@/components/ui';
import { usePlayer, usePlayerStore } from '@/player';
import { useTheme } from '@/theme';

const qualityOptions: Array<{ value: AudioQuality; label: string }> = [
  { value: 'auto', label: '自动' },
  { value: 'standard', label: '标准' },
  { value: 'high', label: '高' },
  { value: 'lossless', label: '无损' },
];
const modeOptions = [
  { value: 'sequential' as const, label: '顺序' },
  { value: 'repeat_all' as const, label: '循环' },
  { value: 'repeat_one' as const, label: '单曲' },
  { value: 'shuffle' as const, label: '随机' },
];

export default function SettingsScreen() {
  const { theme, preference, setPreference } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const player = usePlayer();
  const queryClient = useQueryClient();
  const quality = usePlayerStore((state) => state.quality);
  const playbackMode = usePlayerStore((state) => state.playbackMode);
  const gatewayHealth = useQuery({
    queryKey: ['gateway', 'health'],
    queryFn: async () => (await apiClient.request('/v1/health', undefined, HealthDataSchema)).data,
    staleTime: 30_000,
  });

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>设置</Text>
        <View style={styles.headerSpace} />
      </View>

      <SettingsSection title="播放">
        <SettingsRow icon="musical-notes-outline" title="音质" subtitle={qualityOptions.find((option) => option.value === quality)?.label ?? '自动'} />
        <View style={[styles.segment, { backgroundColor: theme.colors.surfaceMuted }]}>
          {qualityOptions.map((option) => (
            <Pressable key={option.value} accessibilityLabel={`${option.label}音质`} accessibilityRole="button" onPress={() => player.setQuality(option.value)} style={[styles.segmentItem, quality === option.value && { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.segmentLabel, { color: quality === option.value ? theme.colors.textPrimary : theme.colors.textSecondary }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <SettingsRow icon="play-forward-outline" title="播放行为" subtitle={modeOptions.find((option) => option.value === playbackMode)?.label ?? '顺序'} />
        <View style={[styles.segment, { backgroundColor: theme.colors.surfaceMuted }]}>
          {modeOptions.map((option) => (
            <Pressable key={option.value} accessibilityLabel={`${option.label}播放`} accessibilityRole="button" onPress={() => player.setMode(option.value)} style={[styles.segmentItem, playbackMode === option.value && { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.segmentLabel, { color: playbackMode === option.value ? theme.colors.textPrimary : theme.colors.textSecondary }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </SettingsSection>
      <SettingsSection title="外观">
        <SettingsRow icon="contrast-outline" title="主题" subtitle={preference === 'system' ? '跟随系统' : preference === 'dark' ? '深色' : '浅色'} />
        <View style={[styles.segment, { backgroundColor: theme.colors.surfaceMuted }]}>
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <Pressable
              accessibilityLabel={`${mode === 'system' ? '跟随系统' : mode === 'light' ? '浅色' : '深色'}主题`}
              accessibilityRole="button"
              key={mode}
              onPress={() => setPreference(mode)}
              style={[styles.segmentItem, preference === mode && { backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.segmentLabel, { color: preference === mode ? theme.colors.textPrimary : theme.colors.textSecondary }]}>{mode === 'system' ? '系统' : mode === 'light' ? '浅色' : '深色'}</Text>
            </Pressable>
          ))}
        </View>
      </SettingsSection>
      <SettingsSection title="账户">
        {auth.isAuthenticated ? (
          <>
            <Text style={[styles.accountName, { color: theme.colors.textPrimary }]}>{auth.user?.nickname}</Text>
            <Button onPress={() => void auth.logout()} variant="secondary">退出登录</Button>
          </>
        ) : <Button onPress={() => router.push('/login')} variant="secondary">登录网易云音乐</Button>}
      </SettingsSection>
      <SettingsSection title="服务">
        <SettingsRow icon="cloud-outline" title="Gateway 状态" subtitle={gatewayHealth.isPending ? '检查中…' : gatewayHealth.isError ? '暂时不可用' : gatewayHealth.data.status === 'ok' ? '在线' : '未知'} />
        <Button onPress={() => void gatewayHealth.refetch()} variant="secondary">重新检查</Button>
      </SettingsSection>
      <SettingsSection title="数据">
        <Button onPress={() => queryClient.clear()} variant="secondary">清理本机缓存</Button>
      </SettingsSection>
      <SettingsSection title="关于">
        <Text style={[styles.about, { color: theme.colors.textSecondary }]}>SiPlayer 0.1.0</Text>
        <Text style={[styles.about, { color: theme.colors.textTertiary }]}>作者 Origin173 · 音乐优先，低干扰。</Text>
      </SettingsSection>
    </Screen>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{children}</View>
    </View>
  );
}

function SettingsRow({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.divider }]}>
      <Ionicons color={theme.colors.primary} name={icon} size={22} />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Ionicons color={theme.colors.textTertiary} name="chevron-forward" size={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  headerSpace: { height: 44, width: 44 },
  title: { fontSize: 20, fontWeight: '700' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  group: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 8 },
  row: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', minHeight: 64, paddingHorizontal: 8 },
  rowCopy: { flex: 1, marginHorizontal: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 12, marginTop: 2 },
  segment: { borderRadius: 999, flexDirection: 'row', gap: 4, margin: 8, padding: 3 },
  segmentItem: { alignItems: 'center', borderRadius: 999, flex: 1, minHeight: 38, justifyContent: 'center' },
  segmentLabel: { fontSize: 13, fontWeight: '600' },
  accountName: { fontSize: 15, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 10 },
  about: { fontSize: 13, lineHeight: 20, paddingHorizontal: 8, paddingVertical: 4 },
});
