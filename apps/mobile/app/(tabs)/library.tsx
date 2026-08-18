import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { AppCard, Button, Screen } from '@/components/ui';
import { SongRow } from '@/components/music';
import { mockTracks } from '@/features/mockData';
import { queueItemFromTrack } from '@/player/playbackTypes';
import { usePlayer } from '@/player';
import { useTheme } from '@/theme';

export default function LibraryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();

  return (
    <Screen>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>音乐库</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>管理你真正想留下的音乐</Text>

      <AppCard variant="accent">
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>登录网易云音乐</Text>
        <Text style={[styles.cardCopy, { color: theme.colors.textSecondary }]}>登录后同步喜欢的音乐和歌单。本机最近播放始终保留。</Text>
        <Button onPress={() => router.push('/login')}>扫码登录</Button>
      </AppCard>

      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>本机最近播放</Text>
      {mockTracks.slice(0, 3).map((track) => (
        <SongRow key={track.id} onPress={() => player.playTrack(queueItemFromTrack(track))} track={track} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  subtitle: { fontSize: 14, marginTop: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  cardCopy: { fontSize: 14, lineHeight: 20, marginBottom: 16, marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, marginTop: 32 },
});
