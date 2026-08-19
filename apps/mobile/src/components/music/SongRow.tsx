import Ionicons from '@expo/vector-icons/Ionicons';
import type { Track } from '@siplayer/contracts';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { Artwork } from './Artwork';
import { getQueueRowActionState } from './queueRowActions';

interface SongRowProps {
  track: Track;
  onPress?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isCurrent?: boolean;
}

export function SongRow({ track, onPress, onRemove, onMoveUp, onMoveDown, isCurrent = false }: SongRowProps) {
  const { theme } = useTheme();
  const disabled = !track.playable;
  const { showMoveControls, showRemove } = getQueueRowActionState({
    canMoveUp: Boolean(onMoveUp),
    canMoveDown: Boolean(onMoveDown),
    canRemove: Boolean(onRemove),
  });

  return (
    <Pressable
      accessibilityHint={disabled ? '当前歌曲不可播放' : undefined}
      accessibilityLabel={`${track.name}，${track.artistText}${isCurrent ? '，正在播放' : ''}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: disabled ? 0.52 : pressed ? 0.7 : 1 }]}
    >
      <Artwork size={48} title={track.name} uri={track.artworkUrl} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: isCurrent ? theme.colors.primary : theme.colors.textPrimary }]}>
          {track.name}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: theme.colors.textSecondary }]}>
          {track.artistText}{track.album?.name ? ` · ${track.album.name}` : ''}
        </Text>
        {!track.playable && track.availability?.message ? (
          <Text numberOfLines={1} style={[styles.unavailable, { color: theme.colors.danger }]}>{track.availability.message}</Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {isCurrent ? <Ionicons color={theme.colors.primary} name="volume-high-outline" size={20} /> : null}
        {showMoveControls ? (
          <View style={styles.reorderButtons}>
            {onMoveUp ? <Pressable accessibilityLabel={`上移 ${track.name}`} accessibilityRole="button" hitSlop={6} onPress={onMoveUp}><Ionicons color={theme.colors.textSecondary} name="chevron-up" size={18} /></Pressable> : null}
            {onMoveDown ? <Pressable accessibilityLabel={`下移 ${track.name}`} accessibilityRole="button" hitSlop={6} onPress={onMoveDown}><Ionicons color={theme.colors.textSecondary} name="chevron-down" size={18} /></Pressable> : null}
          </View>
        ) : null}
        {showRemove ? (
          <Pressable accessibilityLabel={`从队列移除 ${track.name}`} accessibilityRole="button" hitSlop={8} onPress={onRemove}>
            <Ionicons color={theme.colors.textTertiary} name="close-circle-outline" size={21} />
          </Pressable>
        ) : null}
        {!showMoveControls && !showRemove ? <Ionicons color={theme.colors.textTertiary} name="ellipsis-horizontal" size={22} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', minHeight: 68, paddingVertical: 8 },
  copy: { flex: 1, marginHorizontal: 12, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  meta: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  unavailable: { fontSize: 11, lineHeight: 15, marginTop: 1 },
  trailing: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  reorderButtons: { alignItems: 'center', flexDirection: 'row', gap: 2 },
});
