import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAlbumDetail } from '@/api/hooks';
import { Artwork, SongRow } from '@/components/music';
import { Button, EmptyState, ErrorState, IconButton, Screen, Skeleton } from '@/components/ui';
import { queueItemFromTrack } from '@/player/playbackTypes';
import { usePlayer } from '@/player';
import { getOverlayAwareListPadding } from '@/layout/overlayMetrics';
import { useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AlbumDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const player = usePlayer();
  const { id } = useLocalSearchParams<{ id: string }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const albumQuery = useAlbumDetail(albumId);

  if (albumQuery.isPending) {
    return (
      <Screen>
        <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
        <View style={styles.loading}>
          <Skeleton height={160} width={160} radius={20} />
          <Skeleton height={28} width="64%" />
          <Skeleton height={68} />
          <Skeleton height={68} />
        </View>
      </Screen>
    );
  }

  if (albumQuery.isError) {
    return (
      <Screen>
        <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
        <ErrorState onRetry={() => void albumQuery.refetch()} />
      </Screen>
    );
  }

  const album = albumQuery.data;
  if (!album) return <Screen><EmptyState title="专辑不存在" message="找不到这个专辑。" /></Screen>;
  const playableTracks = album.tracks.filter((track) => track.playable);
  const queueItems = playableTracks.map(queueItemFromTrack);

  return (
    <Screen contentContainerStyle={styles.screenContent} scroll={false}>
      <FlashList
        contentContainerStyle={[styles.listContent, { paddingBottom: getOverlayAwareListPadding(insets.bottom) }]}
        data={album.tracks}
        keyExtractor={(track, index) => `${track.id}-${index}`}
        ListEmptyComponent={<EmptyState message="这个专辑暂时没有歌曲。" title="暂无歌曲" />}
        ListHeaderComponent={(
          <>
            <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
            <View style={styles.hero}>
              <Artwork size={160} title={album.name} uri={album.artworkUrl} />
              <View style={styles.heroCopy}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{album.name}</Text>
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{album.artists.map((artist) => artist.name).join(' / ') || '未知艺术家'}</Text>
                <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{album.tracks.length} 首歌曲</Text>
                {album.description ? <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{album.description}</Text> : null}
              </View>
            </View>
            <View style={styles.actions}>
              <Button disabled={queueItems.length === 0} onPress={() => player.setQueue(queueItems, 0)}>播放全部</Button>
            </View>
          </>
        )}
        renderItem={({ item }) => {
          const playableIndex = playableTracks.findIndex((track) => track.id === item.id);
          return <SongRow onPress={() => {
            if (playableIndex >= 0) player.playTrack(queueItemFromTrack(item), { queue: queueItems, startIndex: playableIndex });
          }} track={item} />;
        }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 16, paddingTop: 24 },
  hero: { alignItems: 'center', gap: 20, marginBottom: 24, marginTop: 20 },
  heroCopy: { alignItems: 'center', maxWidth: 340 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30, textAlign: 'center' },
  meta: { fontSize: 13, marginTop: 6 },
  description: { fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  screenContent: { paddingHorizontal: 0, paddingBottom: 0 },
  listContent: { paddingBottom: 48, paddingHorizontal: 20 },
});
