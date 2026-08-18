import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Artwork, SongRow } from '@/components/music';
import { Button, IconButton, Screen } from '@/components/ui';
import { mockPlaylists, mockTracks } from '@/features/mockData';
import { queueItemFromTrack } from '@/player/playbackTypes';
import { usePlayer } from '@/player';
import { useTheme } from '@/theme';

export default function PlaylistDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlist = mockPlaylists.find((item) => item.id === id) ?? mockPlaylists[0];
  const playableTracks = mockTracks.filter((track) => track.playable);

  if (!playlist) return null;

  const playAll = () => player.setQueue(playableTracks.map(queueItemFromTrack), 0);

  return (
    <Screen>
      <IconButton accessibilityLabel="返回" name="chevron-back" onPress={() => router.back()} />
      <View style={styles.hero}>
        <Artwork size={160} title={playlist.name} uri={playlist.artworkUrl} />
        <View style={styles.heroCopy}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{playlist.name}</Text>
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{playlist.trackCount ?? playableTracks.length} 首歌曲</Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>把喜欢的歌曲放在一起，安静地听完。</Text>
        </View>
      </View>
      <Button onPress={playAll}>播放全部</Button>
      <View style={styles.list}>
        {mockTracks.map((track) => (
          <SongRow key={track.id} onPress={() => {
            const index = playableTracks.findIndex((item) => item.id === track.id);
            if (index >= 0) player.playTrack(queueItemFromTrack(track), { queue: playableTracks.map(queueItemFromTrack), startIndex: index });
          }} track={track} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 20, marginBottom: 24, marginTop: 20 },
  heroCopy: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30, textAlign: 'center' },
  meta: { fontSize: 13, marginTop: 6 },
  description: { fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
  list: { marginTop: 20 },
});
