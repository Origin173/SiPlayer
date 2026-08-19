import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/auth';
import { useTrackLike } from '@/api/hooks';
import { Artwork, SongRow } from '@/components/music';
import { Button, EmptyState, IconButton, Screen } from '@/components/ui';
import { trackFromQueueItem } from '@/player/playbackTypes';
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
  const playbackMode = usePlayerStore((state) => state.playbackMode);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const current = queue[currentIndex];
  const [liked, setLiked] = useState(current?.track?.liked ?? false);
  const [queueOpen, setQueueOpen] = useState(false);
  useEffect(() => setLiked(current?.track?.liked ?? false), [current?.track?.liked, current?.trackId]);
  const artworkSize = Math.min(Math.max(width - 64, 240), 360);
  const isPlaying = playbackState === 'playing';
  const hasPlaybackError = playbackState === 'error' || playbackState === 'unavailable';
  const playbackErrorMessage = playbackState === 'unavailable'
    ? current?.track?.availability?.message ?? '当前歌曲暂不可播放'
    : '播放遇到问题，请检查网络后重试。';
  const progress = durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;
  const [progressWidth, setProgressWidth] = useState(0);
  const [draftProgress, setDraftProgress] = useState<number | null>(null);
  const draftProgressRef = useRef<number | null>(null);
  const displayedProgress = draftProgress ?? progress;
  const displayedPositionMs = durationMs > 0 ? Math.round(displayedProgress * durationMs) : positionMs;
  const setDraftFromLocation = useCallback((locationX: number) => {
    if (progressWidth <= 0 || durationMs <= 0) return;
    const next = Math.max(0, Math.min(locationX / progressWidth, 1));
    draftProgressRef.current = next;
    setDraftProgress(next);
  }, [durationMs, progressWidth]);
  const finishSeek = useCallback(() => {
    const next = draftProgressRef.current;
    draftProgressRef.current = null;
    setDraftProgress(null);
    if (next != null && durationMs > 0) player.seekTo(Math.round(next * durationMs));
  }, [durationMs, player]);
  const progressResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => setDraftFromLocation(event.nativeEvent.locationX),
    onPanResponderMove: (event) => setDraftFromLocation(event.nativeEvent.locationX),
    onPanResponderRelease: finishSeek,
    onPanResponderTerminate: finishSeek,
  }), [finishSeek, setDraftFromLocation]);
  const modeIcon = playbackMode === 'shuffle' ? 'shuffle-outline' : 'repeat-outline';
  const modeLabel = playbackMode === 'sequential' ? '顺序播放' : playbackMode === 'repeat_all' ? '循环播放' : playbackMode === 'repeat_one' ? '单曲循环' : '随机播放';
  const cycleMode = () => {
    const modes = ['sequential', 'repeat_all', 'repeat_one', 'shuffle'] as const;
    const nextMode = modes[(modes.indexOf(playbackMode) + 1) % modes.length];
    if (nextMode) player.setMode(nextMode);
  };

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
        <View style={styles.headerSpace} />
      </View>

      <View style={styles.artworkWrap}>
        <Artwork size={artworkSize} title={current.title} uri={current.artworkUrl} />
      </View>
      <View style={styles.trackCopy}>
        <Text numberOfLines={2} style={[styles.trackTitle, { color: theme.colors.textPrimary }]}>{current.title}</Text>
        <Text numberOfLines={1} style={[styles.artist, { color: theme.colors.textSecondary }]}>{current.artistText}</Text>
      </View>

      {hasPlaybackError ? (
        <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.playbackError, { backgroundColor: theme.colors.dangerSoft }]}>
          <Text style={[styles.playbackErrorTitle, { color: theme.colors.danger }]}>{playbackErrorMessage}</Text>
          <Button onPress={player.play} variant="text">重试播放</Button>
        </View>
      ) : null}

      <View style={styles.progressWrap}>
        <View
          accessible
          accessibilityLabel={`播放进度 ${formatTime(displayedPositionMs)} / ${formatTime(durationMs)}`}
          accessibilityRole="adjustable"
          accessibilityValue={{ max: durationMs, min: 0, now: displayedPositionMs }}
          onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
          style={styles.progressTouchArea}
          {...progressResponder.panHandlers}
        >
          <View pointerEvents="none" style={[styles.progressHitArea, { backgroundColor: theme.colors.surfaceMuted }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.colors.primary, width: `${displayedProgress * 100}%` }]} />
          </View>
        </View>
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{formatTime(displayedPositionMs)}</Text>
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
        <IconButton accessibilityLabel={`切换播放模式，当前${modeLabel}`} name={modeIcon} onPress={cycleMode} />
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
        <IconButton accessibilityLabel="打开播放队列" name="list-outline" onPress={() => setQueueOpen(true)} />
      </View>

      <View style={[styles.queueHeader, { borderTopColor: theme.colors.divider }]}>
        <Text style={[styles.queueTitle, { color: theme.colors.textPrimary }]}>播放队列</Text>
        <View style={styles.queueActions}>
          <Text style={[styles.queueCount, { color: theme.colors.textSecondary }]}>{queue.length} 首</Text>
          {currentIndex < queue.length - 1 ? <Pressable accessibilityLabel="清空后续歌曲" accessibilityRole="button" onPress={player.clearNext}><Text style={[styles.clearNext, { color: theme.colors.primary }]}>清空后续</Text></Pressable> : null}
        </View>
      </View>
      <ScrollView scrollEnabled={false}>
        {queue.map((item, index) => (
          <SongRow
            key={`${item.trackId}-${index}`}
            isCurrent={index === currentIndex}
            onPress={() => player.setQueue(queue, index)}
            onRemove={index === currentIndex ? undefined : () => player.removeFromQueue(index)}
            track={trackFromQueueItem(item)}
          />
        ))}
      </ScrollView>
      <Text style={[styles.sourceNote, { color: theme.colors.textTertiary }]}>播放地址由 Gateway 临时解析，不会写入队列</Text>

      <Modal animationType="slide" onRequestClose={() => setQueueOpen(false)} transparent visible={queueOpen}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel="关闭播放队列" onPress={() => setQueueOpen(false)} style={styles.modalBackdrop} />
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dragIndicator} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.queueTitle, { color: theme.colors.textPrimary }]}>播放队列</Text>
              <IconButton accessibilityLabel="关闭播放队列" name="close" onPress={() => setQueueOpen(false)} />
            </View>
            <ScrollView>
              {queue.map((item, index) => (
                <SongRow
                  key={`sheet-${item.trackId}-${index}`}
                  isCurrent={index === currentIndex}
                  onPress={() => { setQueueOpen(false); player.setQueue(queue, index); }}
                  onRemove={index === currentIndex ? undefined : () => player.removeFromQueue(index)}
                  track={trackFromQueueItem(item)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'stretch' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerTitle: { fontSize: 13, fontWeight: '600' },
  headerSpace: { height: 44, width: 44 },
  artworkWrap: { alignItems: 'center', marginVertical: 24 },
  trackCopy: { alignItems: 'center' },
  trackTitle: { fontSize: 24, fontWeight: '700', lineHeight: 30, textAlign: 'center' },
  artist: { fontSize: 15, marginTop: 6 },
  progressWrap: { marginTop: 28 },
  progressTouchArea: { justifyContent: 'center', minHeight: 32 },
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
  queueActions: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  clearNext: { fontSize: 12, fontWeight: '600' },
  sourceNote: { fontSize: 11, marginTop: 16, textAlign: 'center' },
  playbackError: { alignItems: 'center', borderRadius: 12, gap: 2, marginTop: 16, paddingHorizontal: 12, paddingVertical: 8 },
  playbackErrorTitle: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { backgroundColor: 'rgba(0, 0, 0, 0.35)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', paddingBottom: 24, paddingHorizontal: 16, paddingTop: 10 },
  dragIndicator: { alignSelf: 'center', backgroundColor: '#A5A5A5', borderRadius: 999, height: 4, marginBottom: 8, width: 36 },
  sheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
});
