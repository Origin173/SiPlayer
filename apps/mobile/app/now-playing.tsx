import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '@/auth';
import { useTrackLike } from '@/api/hooks';
import { Artwork, SongRow } from '@/components/music';
import { EmptyState, IconButton, Screen } from '@/components/ui';
import { mockTracks } from '@/features/mockData';
import { usePlayer, usePlayerStore } from '@/player';
import { useTheme } from '@/theme';
import { formatTime } from '@/utils/formatTime';

export default function NowPlayingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const auth = useAuth();
  const likeMutation = useTrackLike();
  const { width } = useWindowDimensions();
  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const current = queue[currentIndex];
  const [liked, setLiked] = useState(current?.track?.liked ?? false);
  useEffect(() => setLiked(current?.track?.liked ?? false), [current?.track?.liked, current?.trackId]);
  const artworkSize = Math.min(Math.max(width - 64, 240), 360);
  const isPlaying = playbackState === 'playing';
  const progress = durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;

  if (!current) {
    return (
      <Screen>
        <IconButton accessibilityLabel="关闭正在播放" name="chevron-down" onPress={() => router.back()} />
        <EmptyState message="播放一首歌后，这里会显示完整控制。" onAction={() => router.replace('/(tabs)/search')} actionLabel="去搜索" title="还没有正在播放" />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="关闭正在播放" name="chevron-down" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.textSecondary }]}>正在播放</Text>
        <IconButton accessibilityLabel="更多播放选项" name="ellipsis-horizontal" onPress={() => undefined} />
      </View>

      <View style={styles.artworkWrap}>
        <Artwork size={artworkSize} title={current.title} uri={current.artworkUrl} />
      </View>
      <View style={styles.trackCopy}>
        <Text numberOfLines={2} style={[styles.trackTitle, { color: theme.colors.textPrimary }]}>{current.title}</Text>
        <Text numberOfLines={1} style={[styles.artist, { color: theme.colors.textSecondary }]}>{current.artistText}</Text>
      </View>

      <View style={styles.progressWrap}>
        <Pressable
          accessibilityLabel={`播放进度 ${formatTime(positionMs)} / ${formatTime(durationMs)}`}
          accessibilityRole="adjustable"
          onPress={() => player.seekTo(durationMs > 0 ? (progress < 0.5 ? durationMs / 2 : 0) : 0)}
          style={[styles.progressHitArea, { backgroundColor: theme.colors.surfaceMuted }]}
        >
          <View style={[styles.progressFill, { backgroundColor: theme.colors.primary, width: `${progress * 100}%` }]} />
        </Pressable>
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{formatTime(positionMs)}</Text>
          <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{formatTime(durationMs)}</Text>
        </View>
      </View>

      <View style={styles.primaryControls}>
        <IconButton accessibilityLabel="上一首" iconSize={30} name="play-skip-back" onPress={player.previous} size={52} />
        <Pressable
          accessibilityLabel={isPlaying ? '暂停' : '播放'}
          accessibilityRole="button"
          onPress={isPlaying ? player.pause : player.play}
          style={({ pressed }) => [styles.playButton, { backgroundColor: theme.colors.primary, opacity: pressed ? 0.86 : 1 }]}
        >
          <Ionicons color={theme.colors.textOnPrimary} name={isPlaying ? 'pause' : 'play'} size={30} />
        </Pressable>
        <IconButton accessibilityLabel="下一首" iconSize={30} name="play-skip-forward" onPress={player.next} size={52} />
      </View>

      <View style={styles.secondaryControls}>
        <IconButton accessibilityLabel="切换播放模式" name="repeat-outline" onPress={() => player.setMode('repeat_all')} />
        <IconButton
          accessibilityLabel={liked ? '取消喜欢' : '喜欢这首歌'}
          color={liked ? theme.colors.primary : undefined}
          disabled={likeMutation.isPending}
          name={liked ? 'heart' : 'heart-outline'}
          onPress={() => {
            if (!auth.isAuthenticated) {
              router.push('/login');
              return;
            }
            const nextLiked = !liked;
            setLiked(nextLiked);
            likeMutation.mutate({ liked: nextLiked, trackId: current.trackId }, { onError: () => setLiked(liked) });
          }}
        />
        <IconButton accessibilityLabel="查看歌词" name="text-outline" onPress={() => router.push('/lyrics')} />
        <IconButton accessibilityLabel="打开播放队列" name="list-outline" onPress={() => undefined} />
      </View>

      <View style={[styles.queueHeader, { borderTopColor: theme.colors.divider }]}>
        <Text style={[styles.queueTitle, { color: theme.colors.textPrimary }]}>播放队列</Text>
        <Text style={[styles.queueCount, { color: theme.colors.textSecondary }]}>{queue.length} 首</Text>
      </View>
      <ScrollView scrollEnabled={false}>
        {queue.map((item, index) => {
          const track = mockTracks.find((candidate) => candidate.id === item.trackId);
          return track ? <SongRow key={`${item.trackId}-${index}`} isCurrent={index === currentIndex} onPress={() => player.setQueue(queue, index)} track={track} /> : null;
        })}
      </ScrollView>
      <Text style={[styles.sourceNote, { color: theme.colors.textTertiary }]}>播放地址由 Gateway 临时解析，不会写入队列</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'stretch' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerTitle: { fontSize: 13, fontWeight: '600' },
  artworkWrap: { alignItems: 'center', marginVertical: 24 },
  trackCopy: { alignItems: 'center' },
  trackTitle: { fontSize: 24, fontWeight: '700', lineHeight: 30, textAlign: 'center' },
  artist: { fontSize: 15, marginTop: 6 },
  progressWrap: { marginTop: 28 },
  progressHitArea: { borderRadius: 999, height: 8, justifyContent: 'center', overflow: 'hidden' },
  progressFill: { borderRadius: 999, height: '100%' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { fontSize: 12 },
  primaryControls: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  playButton: { alignItems: 'center', borderRadius: 999, height: 64, justifyContent: 'center', width: 64 },
  secondaryControls: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  queueHeader: { alignItems: 'center', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 20 },
  queueTitle: { fontSize: 18, fontWeight: '700' },
  queueCount: { fontSize: 12 },
  sourceNote: { fontSize: 11, marginTop: 16, textAlign: 'center' },
});
