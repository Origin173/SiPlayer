import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppCard, Button, IconButton, Screen } from '@/components/ui';
import { PlaylistCard, SongRow } from '@/components/music';
import { mockPlaylists, mockTracks } from '@/features/mockData';
import { queueItemFromTrack } from '@/player/playbackTypes';
import { usePlayer } from '@/player';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const playableTracks = mockTracks.filter((track) => track.playable);

  const playTrack = (trackId: string) => {
    const index = playableTracks.findIndex((track) => track.id === trackId);
    const track = playableTracks[index];
    if (!track) return;
    player.playTrack(queueItemFromTrack(track), {
      queue: playableTracks.map(queueItemFromTrack),
      startIndex: index,
    });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={[styles.eyebrow, { color: theme.colors.textSecondary }]}>欢迎回来</Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>打开就是音乐</Text>
        </View>
        <IconButton accessibilityLabel="打开设置" name="settings-outline" onPress={() => router.push('/settings')} />
      </View>

      <AppCard variant="accent">
        <Text style={[styles.cardEyebrow, { color: theme.colors.primary }]}>今日状态</Text>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>让喜欢的声音保持简单</Text>
        <Text style={[styles.cardCopy, { color: theme.colors.textSecondary }]}>搜索一首歌，继续你的播放。</Text>
        <Button onPress={() => router.push('/search')} variant="primary">去搜索</Button>
      </AppCard>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>最近播放</Text>
        <Text style={[styles.sectionAction, { color: theme.colors.primary }]}>本机记录</Text>
      </View>
      <View>
        {playableTracks.slice(0, 3).map((track) => (
          <SongRow key={track.id} onPress={() => playTrack(track.id)} track={track} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>我的歌单</Text>
        <Ionicons color={theme.colors.textTertiary} name="chevron-forward" size={20} />
      </View>
      <ScrollView contentContainerStyle={styles.playlists} horizontal showsHorizontalScrollIndicator={false}>
        {mockPlaylists.map((playlist) => (
          <PlaylistCard key={playlist.id} onPress={() => router.push(`/playlist/${playlist.id}`)} playlist={playlist} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  greeting: { gap: 4 },
  eyebrow: { fontSize: 13 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  cardEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  cardCopy: { fontSize: 14, lineHeight: 20, marginBottom: 16, marginTop: 4 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionAction: { fontSize: 12 },
  playlists: { gap: 16, paddingBottom: 8 },
});
