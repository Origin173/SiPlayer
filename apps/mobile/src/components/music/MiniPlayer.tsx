import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/theme';
import { usePlayer, usePlayerStore } from '@/player';
import { getPlaybackProgress } from '@/player/playbackProgress';
import { MINI_PLAYER_HEIGHT } from '@/layout/overlayMetrics';
import { Artwork } from './Artwork';
import { IconButton } from '../ui';

export function MiniPlayer() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const current = queue[currentIndex];

  if (!current) return null;

  const isPlaying = playbackState === 'playing';
  const hasPlaybackError = playbackState === 'error' || playbackState === 'unavailable';
  const progress = getPlaybackProgress(positionMs, durationMs);
  const statusText = hasPlaybackError ? (playbackState === 'unavailable' ? '当前歌曲暂不可播放' : '播放遇到问题，点击重试') : current.artistText;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, theme.shadows.floating]}>
      <PressableBody onPress={() => router.push('/now-playing')}>
        <Artwork size={46} title={current.title} uri={current.artworkUrl} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>{current.title}</Text>
          <Text numberOfLines={1} style={[styles.artist, { color: hasPlaybackError ? theme.colors.danger : theme.colors.textSecondary }]}>{statusText}</Text>
        </View>
      </PressableBody>
      <IconButton
        accessibilityLabel={hasPlaybackError ? '重试播放' : isPlaying ? '暂停' : '播放'}
        iconSize={22}
        name={hasPlaybackError ? 'refresh' : isPlaying ? 'pause' : 'play'}
        onPress={hasPlaybackError || !isPlaying ? player.play : player.pause}
      />
      <IconButton accessibilityLabel="打开播放队列" iconSize={22} name="list-outline" onPress={() => router.push({ pathname: '/now-playing', params: { queue: '1' } })} />
      {durationMs > 0 && !hasPlaybackError ? <View style={[styles.progress, { backgroundColor: theme.colors.primary, width: `${progress * 100}%` }]} /> : null}
    </View>
  );
}

function PressableBody({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="打开正在播放" accessibilityRole="button" onPress={onPress} style={styles.body}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', minHeight: MINI_PLAYER_HEIGHT, overflow: 'hidden', paddingHorizontal: 8 },
  body: { alignItems: 'center', flex: 1, flexDirection: 'row', minHeight: 48 },
  copy: { flex: 1, marginHorizontal: 10, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '600' },
  artist: { fontSize: 12, marginTop: 2 },
  progress: { bottom: 0, height: 2, left: 0, position: 'absolute' },
});
