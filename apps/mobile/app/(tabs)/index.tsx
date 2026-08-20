import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth';
import { useRecentTracks, useUserPlaylists } from '@/api/hooks';
import { AppCard, Button, EmptyState, ErrorState, IconButton, Screen, Skeleton } from '@/components/ui';
import { PlaylistCard, SongRow } from '@/components/music';
import { loadLocalHistory, subscribeLocalHistory } from '@/features/localHistory';
import { mergeRecentTracks } from '@/features/recentTracks';
import { queueItemFromTrack } from '@/player/playbackTypes';
import type { Track } from '@siplayer/contracts';
import { usePlayer } from '@/player';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const auth = useAuth();
  const [localHistory, setLocalHistory] = useState<Track[]>([]);
  const recentQuery = useRecentTracks(auth.isAuthenticated && !auth.isHydrating);
  const playlistsQuery = useUserPlaylists(auth.isAuthenticated && !auth.isHydrating);
  const recentTracks = useMemo(() => {
    const cloudItems = recentQuery.data?.items ?? [];
    return mergeRecentTracks(cloudItems, localHistory).filter((track) => track.playable);
  }, [localHistory, recentQuery.data?.items]);
  const playlists = useMemo(() => {
    if (!playlistsQuery.data) return [];
    return [...playlistsQuery.data.created, ...playlistsQuery.data.subscribed];
  }, [playlistsQuery.data]);

  useEffect(() => {
    const reload = () => {
      void loadLocalHistory().then(setLocalHistory);
    };
    reload();
    return subscribeLocalHistory(reload);
  }, []);

  const playTrack = (trackId: string) => {
    const index = recentTracks.findIndex((track) => track.id === trackId);
    const track = recentTracks[index];
    if (!track) return;
    player.playTrack(queueItemFromTrack(track), {
      queue: recentTracks.map(queueItemFromTrack),
      startIndex: index,
    });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={[styles.eyebrow, { color: theme.colors.textSecondary }]}>欢迎回来</Text>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{auth.user ? `${auth.user.nickname}，继续播放` : '打开就是音乐'}</Text>
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
        <Text style={[styles.sectionAction, { color: theme.colors.primary }]}>{auth.isAuthenticated && recentQuery.data ? '云端 + 本机' : '本机记录'}</Text>
      </View>
      {auth.isAuthenticated && recentQuery.isError ? (
        <ErrorState onRetry={() => void recentQuery.refetch()} />
      ) : auth.isAuthenticated && recentQuery.isPending ? (
        <View style={styles.loadingRows}><Skeleton height={68} /><Skeleton height={68} /></View>
      ) : recentTracks.length > 0 ? (
        <View>{recentTracks.slice(0, 3).map((track) => <SongRow key={track.id} onPress={() => playTrack(track.id)} track={track} />)}</View>
      ) : (
        <EmptyState message="搜索一首歌，开始你的播放记录。" onAction={() => router.push('/search')} actionLabel="去搜索" title="还没有最近播放" />
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>我的歌单</Text>
        <Ionicons color={theme.colors.textTertiary} name="chevron-forward" size={20} />
      </View>
      {!auth.isAuthenticated ? (
        <EmptyState message="登录后可以同步创建和收藏的歌单。" onAction={() => router.push('/login')} actionLabel="扫码登录" title="登录后查看歌单" />
      ) : playlistsQuery.isError ? (
        <ErrorState onRetry={() => void playlistsQuery.refetch()} />
      ) : playlistsQuery.isPending ? (
        <ScrollView contentContainerStyle={styles.playlists} horizontal showsHorizontalScrollIndicator={false}><Skeleton height={190} width={148} /><Skeleton height={190} width={148} /></ScrollView>
      ) : playlists.length > 0 ? (
        <ScrollView contentContainerStyle={styles.playlists} horizontal showsHorizontalScrollIndicator={false}>
          {playlists.map((playlist) => <PlaylistCard key={playlist.id} onPress={() => router.push(`/playlist/${playlist.id}`)} playlist={playlist} />)}
        </ScrollView>
      ) : (
        <EmptyState message="还没有同步到歌单。" title="暂无歌单" />
      )}
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
  loadingRows: { gap: 8 },
});
