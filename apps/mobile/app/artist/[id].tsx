import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useArtistAlbums, useArtistDetail, useArtistTopTracks } from '@/api/hooks';
import { Artwork, CatalogRow, SongRow } from '@/components/music';
import { Button, EmptyState, ErrorState, IconButton, Screen, Skeleton } from '@/components/ui';
import { queueItemFromTrack } from '@/player/playbackTypes';
import { usePlayer } from '@/player';
import { useTheme } from '@/theme';

export default function ArtistDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const { id } = useLocalSearchParams<{ id: string }>();
  const artistId = Array.isArray(id) ? id[0] : id;
  const artistQuery = useArtistDetail(artistId);
  const topTracksQuery = useArtistTopTracks(artistId);
  const albumsQuery = useArtistAlbums(artistId);

  if (artistQuery.isPending || topTracksQuery.isPending || albumsQuery.isPending) {
    return (
      <Screen>
        <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
        <View style={styles.loading}>
          <Skeleton height={120} width={120} radius={60} />
          <Skeleton height={28} width="56%" />
          <Skeleton height={68} />
          <Skeleton height={68} />
        </View>
      </Screen>
    );
  }

  if (artistQuery.isError || topTracksQuery.isError || albumsQuery.isError) {
    return (
      <Screen>
        <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
        <ErrorState message="歌手资料暂时无法加载，请稍后重试。" onRetry={() => {
          void artistQuery.refetch();
          void topTracksQuery.refetch();
          void albumsQuery.refetch();
        }} />
      </Screen>
    );
  }

  const artist = artistQuery.data;
  const tracks = topTracksQuery.data ?? [];
  const albums = albumsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  if (!artist) return <Screen><EmptyState title="歌手不存在" message="找不到这个歌手。" /></Screen>;
  const playableTracks = tracks.filter((track) => track.playable);
  const queueItems = playableTracks.map(queueItemFromTrack);

  return (
    <Screen contentContainerStyle={styles.screenContent} scroll={false}>
      <FlashList
        contentContainerStyle={styles.listContent}
        data={tracks}
        keyExtractor={(track, index) => `${track.id}-${index}`}
        ListEmptyComponent={<EmptyState message="这个歌手暂时没有热门歌曲。" title="暂无歌曲" />}
        ListFooterComponent={albumsQuery.hasNextPage ? <Button disabled={albumsQuery.isFetchingNextPage} onPress={() => void albumsQuery.fetchNextPage()} variant="secondary">{albumsQuery.isFetchingNextPage ? '加载中…' : '加载更多专辑'}</Button> : null}
        ListHeaderComponent={(
          <>
            <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
            <View style={styles.hero}>
              <Artwork size={120} title={artist.name} uri={artist.avatarUrl} />
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{artist.name}</Text>
              {artist.description ? <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{artist.description}</Text> : null}
            </View>
            <View style={styles.actions}>
              <Button disabled={queueItems.length === 0} onPress={() => player.setQueue(queueItems, 0)}>播放热门歌曲</Button>
            </View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>专辑</Text>
              <Text style={[styles.sectionMeta, { color: theme.colors.textSecondary }]}>{albums.length} 个结果</Text>
            </View>
            {albums.length === 0 ? <Text style={[styles.emptyAlbums, { color: theme.colors.textSecondary }]}>暂无专辑</Text> : albums.map((album) => (
              <CatalogRow key={album.id} item={album} onPress={() => router.push(`/album/${album.id}`)} type="album" />
            ))}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>热门歌曲</Text>
              <Text style={[styles.sectionMeta, { color: theme.colors.textSecondary }]}>{tracks.length} 首</Text>
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
  hero: { alignItems: 'center', gap: 12, marginBottom: 20, marginTop: 20 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30, textAlign: 'center' },
  description: { fontSize: 13, lineHeight: 19, maxWidth: 340, textAlign: 'center' },
  actions: { alignItems: 'center', marginBottom: 20 },
  sectionHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, marginTop: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionMeta: { fontSize: 12 },
  emptyAlbums: { fontSize: 13, paddingVertical: 12 },
  screenContent: { paddingHorizontal: 0, paddingBottom: 0 },
  listContent: { paddingBottom: 48, paddingHorizontal: 20 },
});
