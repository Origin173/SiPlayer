import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth';
import { useRecentTracks, useUserPlaylists } from '@/api/hooks';
import { PlaylistCard, SongRow } from '@/components/music';
import { AppCard, Button, EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui';
import { loadLocalHistory } from '@/features/localHistory';
import { queueItemFromTrack } from '@/player/playbackTypes';
import { usePlayer } from '@/player';
import { useTheme } from '@/theme';
import type { Track } from '@siplayer/contracts';

export default function LibraryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const auth = useAuth();
  const [localHistory, setLocalHistory] = useState<Track[]>([]);
  const playlists = useUserPlaylists(auth.isAuthenticated && !auth.isHydrating);
  const cloudRecent = useRecentTracks(auth.isAuthenticated && !auth.isHydrating);
  const recentTracks = useMemo(() => {
    const cloudItems = cloudRecent.data?.items ?? [];
    return cloudItems.length > 0 ? cloudItems : localHistory;
  }, [cloudRecent.data?.items, localHistory]);

  useEffect(() => {
    void loadLocalHistory().then(setLocalHistory);
  }, []);

  return (
    <Screen>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>音乐库</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>管理你真正想留下的音乐</Text>

      {auth.isHydrating ? (
        <AppCard variant="accent"><Skeleton height={22} width="48%" /><Skeleton height={16} width="82%" /></AppCard>
      ) : auth.isAuthenticated ? (
        <AppCard variant="accent">
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>你好，{auth.user?.nickname}</Text>
          <Text style={[styles.cardCopy, { color: theme.colors.textSecondary }]}>云端歌单和喜欢的音乐已连接。</Text>
          <Button onPress={() => void auth.logout()} variant="secondary">退出登录</Button>
        </AppCard>
      ) : (
        <AppCard variant="accent">
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>登录网易云音乐</Text>
          <Text style={[styles.cardCopy, { color: theme.colors.textSecondary }]}>登录后同步喜欢的音乐和歌单。本机最近播放始终保留。</Text>
          <Button onPress={() => router.push('/login')}>扫码登录</Button>
        </AppCard>
      )}

      {auth.isAuthenticated ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>我的歌单</Text>
            <Text style={[styles.sectionAction, { color: theme.colors.textSecondary }]}>{(playlists.data?.created.length ?? 0) + (playlists.data?.subscribed.length ?? 0)} 个</Text>
          </View>
          {playlists.isPending ? (
            <ScrollView contentContainerStyle={styles.playlists} horizontal showsHorizontalScrollIndicator={false}><Skeleton height={190} width={148} /><Skeleton height={190} width={148} /></ScrollView>
          ) : playlists.isError ? (
            <ErrorState onRetry={() => void playlists.refetch()} />
          ) : playlists.data.created.length + playlists.data.subscribed.length === 0 ? (
            <EmptyState message="还没有同步到歌单。" title="暂无歌单" />
          ) : (
            <ScrollView contentContainerStyle={styles.playlists} horizontal showsHorizontalScrollIndicator={false}>
              {[...playlists.data.created, ...playlists.data.subscribed].map((playlist) => (
                <PlaylistCard key={playlist.id} onPress={() => router.push(`/playlist/${playlist.id}`)} playlist={playlist} />
              ))}
            </ScrollView>
          )}
        </>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>最近播放</Text>
        <Text style={[styles.sectionAction, { color: theme.colors.textSecondary }]}>{auth.isAuthenticated && cloudRecent.data ? '云端 + 本机' : '本机记录'}</Text>
      </View>
      {recentTracks.length > 0 ? recentTracks.slice(0, 10).map((track) => (
        <SongRow key={track.id} onPress={() => player.playTrack(queueItemFromTrack(track))} track={track} />
      )) : <EmptyState message="播放一首歌后，会在这里留下记录。" title="还没有播放记录" />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  subtitle: { fontSize: 14, marginTop: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  cardCopy: { fontSize: 14, lineHeight: 20, marginBottom: 16, marginTop: 6 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionAction: { fontSize: 12 },
  playlists: { gap: 16, paddingBottom: 8 },
});
