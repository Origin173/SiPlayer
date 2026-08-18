import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTrackLyrics } from '@/api/hooks';
import { LyricsList } from '@/components/music';
import { EmptyState, ErrorState, IconButton, Screen, Skeleton } from '@/components/ui';
import { usePlayer, usePlayerStore } from '@/player';
import { useTheme } from '@/theme';

export default function LyricsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const current = queue[currentIndex];
  const lyrics = useTrackLyrics(current?.trackId);

  if (!current) {
    return (
      <Screen>
        <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
        <EmptyState message="播放一首歌后，这里会显示歌词。" title="还没有正在播放" />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content} scroll={false}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="返回正在播放" name="chevron-back" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>歌词</Text>
          <Text numberOfLines={1} style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{current.title} · {current.artistText}</Text>
        </View>
        <View style={styles.headerSpace} />
      </View>
      {lyrics.isPending ? (
        <View style={styles.loading}>
          <Skeleton height={28} width="72%" />
          <Skeleton height={24} width="58%" />
          <Skeleton height={24} width="64%" />
          <Skeleton height={24} width="48%" />
        </View>
      ) : lyrics.isError ? (
        <ErrorState onRetry={() => void lyrics.refetch()} />
      ) : lyrics.data.type === 'NONE' || lyrics.data.lines.length === 0 ? (
        <EmptyState message="这首歌暂时没有可显示的歌词。" title="暂无歌词" />
      ) : (
        <LyricsList lines={lyrics.data.lines} onSeek={player.seekTo} positionMs={positionMs} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0 },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 52 },
  headerCopy: { alignItems: 'center', flex: 1, minWidth: 0 },
  headerSpace: { height: 44, width: 44 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  loading: { alignItems: 'center', flex: 1, gap: 22, justifyContent: 'center' },
});
