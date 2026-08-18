import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { Button, IconButton, Screen } from '@/components/ui';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const { theme, preference, setPreference } = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>设置</Text>
        <View style={styles.headerSpace} />
      </View>

      <SettingsSection title="播放">
        <SettingsRow icon="musical-notes-outline" title="音质" subtitle="自动选择可用音质" />
        <SettingsRow icon="play-forward-outline" title="播放行为" subtitle="顺序播放" />
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
        <Button onPress={() => router.push('/login')} variant="secondary">登录网易云音乐</Button>
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
  about: { fontSize: 13, lineHeight: 20, paddingHorizontal: 8, paddingVertical: 4 },
});
