import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { usePlaylistDetail } from '@/api/hooks';
import { Artwork, SongRow } from '@/components/music';
import { Button, EmptyState, ErrorState, IconButton, Screen, Skeleton } from '@/components/ui';
import { queueItemFromTrack } from '@/player/playbackTypes';
import { usePlayer } from '@/player';
import { useTheme } from '@/theme';

export default function PlaylistDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlistId = Array.isArray(id) ? id[0] : id;
  const playlistQuery = usePlaylistDetail(playlistId);

  if (playlistQuery.isPending) {
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

  if (playlistQuery.isError) {
    return (
      <Screen>
        <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
        <ErrorState onRetry={() => void playlistQuery.refetch()} />
      </Screen>
    );
  }

  const playlist = playlistQuery.data;
  if (!playlist) return <Screen><EmptyState title="歌单不存在" message="找不到这个歌单。" /></Screen>;
  const playableTracks = playlist.tracks.filter((track) => track.playable);

  return (
    <Screen>
      <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
      <View style={styles.hero}>
        <Artwork size={160} title={playlist.name} uri={playlist.artworkUrl} />
        <View style={styles.heroCopy}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{playlist.name}</Text>
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{playlist.trackCount ?? playlist.tracks.length} 首歌曲</Text>
          {playlist.description ? <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{playlist.description}</Text> : null}
        </View>
      </View>
      <Button disabled={playableTracks.length === 0} onPress={() => player.setQueue(playableTracks.map(queueItemFromTrack), 0)}>播放全部</Button>
      <View style={styles.list}>
        {playlist.tracks.length > 0 ? playlist.tracks.map((track, index) => {
          const playableIndex = playableTracks.findIndex((item) => item.id === track.id);
          return <SongRow key={`${track.id}-${index}`} onPress={() => {
            if (playableIndex >= 0) player.playTrack(queueItemFromTrack(track), { queue: playableTracks.map(queueItemFromTrack), startIndex: playableIndex });
          }} track={track} />;
        }) : <EmptyState message="这个歌单暂时没有歌曲。" title="暂无歌曲" />}
      </View>
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
  list: { marginTop: 20 },
});
