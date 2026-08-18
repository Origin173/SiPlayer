import type { PlaylistSummary } from '@siplayer/contracts';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme';
import { Artwork } from './Artwork';

interface PlaylistCardProps {
  playlist: PlaylistSummary;
  onPress?: () => void;
}

export function PlaylistCard({ playlist, onPress }: PlaylistCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable accessibilityLabel={`打开歌单 ${playlist.name}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, width: 148 })}>
      <Artwork size={148} title={playlist.name} uri={playlist.artworkUrl} />
      <Text numberOfLines={2} style={[styles.title, { color: theme.colors.textPrimary }]}>{playlist.name}</Text>
      {playlist.trackCount != null ? <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{playlist.trackCount} 首歌曲</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 14, fontWeight: '600', lineHeight: 19, marginTop: 8 },
  meta: { fontSize: 12, marginTop: 2 },
});
