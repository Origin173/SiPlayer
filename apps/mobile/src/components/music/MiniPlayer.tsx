import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/theme';
import { usePlayer, usePlayerStore } from '@/player';
import { Artwork } from './Artwork';
import { IconButton } from '../ui';

export function MiniPlayer() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const current = queue[currentIndex];

  if (!current) return null;

  const isPlaying = playbackState === 'playing';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, theme.shadows.floating]}>
      <PressableBody onPress={() => router.push('/now-playing')}>
        <Artwork size={46} title={current.title} uri={current.artworkUrl} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>{current.title}</Text>
          <Text numberOfLines={1} style={[styles.artist, { color: theme.colors.textSecondary }]}>{current.artistText}</Text>
        </View>
      </PressableBody>
      <IconButton
        accessibilityLabel={isPlaying ? '暂停' : '播放'}
        iconSize={22}
        name={isPlaying ? 'pause' : 'play'}
        onPress={isPlaying ? player.pause : player.play}
      />
      <IconButton accessibilityLabel="打开播放队列" iconSize={22} name="list-outline" onPress={() => router.push('/now-playing')} />
      {isPlaying ? <View style={[styles.progress, { backgroundColor: theme.colors.primary }]} /> : null}
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
  container: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', minHeight: 64, overflow: 'hidden', paddingHorizontal: 8 },
  body: { alignItems: 'center', flex: 1, flexDirection: 'row', minHeight: 48 },
  bodyPressable: { alignItems: 'center', flex: 1, flexDirection: 'row' },
  copy: { flex: 1, marginHorizontal: 10, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '600' },
  artist: { fontSize: 12, marginTop: 2 },
  progress: { bottom: 0, height: 2, left: 0, position: 'absolute', right: 0 },
});
