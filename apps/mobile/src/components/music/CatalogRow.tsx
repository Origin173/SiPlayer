import type { AlbumSummary, CatalogSearchItem, PlaylistSummary } from '@siplayer/contracts';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { Artwork } from './Artwork';

interface CatalogRowProps {
  item: CatalogSearchItem;
  type: 'album' | 'artist' | 'playlist';
  onPress?: () => void;
}

function isAlbum(item: CatalogSearchItem): item is AlbumSummary {
  return 'artists' in item && Array.isArray(item.artists);
}

function isPlaylist(item: CatalogSearchItem): item is PlaylistSummary {
  return 'creator' in item;
}

export function CatalogRow({ item, type, onPress }: CatalogRowProps) {
  const { theme } = useTheme();
  const album = isAlbum(item) ? item : null;
  const playlist = isPlaylist(item) ? item : null;
  const artworkUrl = album?.artworkUrl ?? playlist?.artworkUrl ?? ('avatarUrl' in item ? item.avatarUrl : null);
  const secondary = type === 'album'
    ? album?.artists.map((artist) => artist.name).join(' / ') || '未知艺术家'
    : type === 'playlist'
      ? playlist?.creator?.name ?? '歌单'
      : '歌手';

  return (
    <Pressable
      accessibilityLabel={`${type === 'album' ? '专辑' : type === 'playlist' ? '歌单' : '歌手'} ${item.name}`}
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.72 : onPress ? 1 : 0.86 }]}
    >
      <Artwork size={48} title={item.name} uri={artworkUrl} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.colors.textPrimary }]}>{item.name}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: theme.colors.textSecondary }]}>{secondary}</Text>
      </View>
      {onPress ? <Text style={[styles.action, { color: theme.colors.primary }]}>打开</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', minHeight: 68, paddingVertical: 8 },
  copy: { flex: 1, marginHorizontal: 12, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  meta: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  action: { fontSize: 12, fontWeight: '600' },
});
