import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTrackSearch } from '@/api/hooks';
import { ErrorState, Screen, SearchField, Skeleton } from '@/components/ui';
import { SongRow } from '@/components/music';
import { queueItemFromTrack } from '@/player/playbackTypes';
import { usePlayer } from '@/player';
import { loadSearchHistory, recordSearchKeyword } from '@/features/searchHistory';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTheme } from '@/theme';

export default function SearchScreen() {
  const { theme } = useTheme();
  const player = usePlayer();
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const debouncedSubmittedKeyword = useDebouncedValue(submittedKeyword, 300);
  const search = useTrackSearch(debouncedSubmittedKeyword);
  const results = search.data?.items ?? [];
  const isDebouncing = submittedKeyword !== debouncedSubmittedKeyword;

  useEffect(() => {
    void loadSearchHistory().then(setHistory);
  }, []);

  const submit = () => {
    const normalized = keyword.trim();
    if (!normalized) {
      setSubmittedKeyword('');
      return;
    }
    setSubmittedKeyword(normalized);
    void recordSearchKeyword(normalized).then(setHistory);
  };

  const onChangeKeyword = (value: string) => {
    setKeyword(value);
    if (!value.trim()) setSubmittedKeyword('');
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>搜索</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>找到下一首想听的歌</Text>
      <View style={styles.search}>
        <SearchField autoFocus onChangeText={onChangeKeyword} onSubmit={submit} value={keyword} />
      </View>

      {!submittedKeyword ? (
        <View style={styles.history}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>最近搜索</Text>
          {history.length > 0 ? <View style={styles.historyList}>{history.map((item) => <Pressable key={item} accessibilityLabel={`再次搜索 ${item}`} accessibilityRole="button" onPress={() => { setKeyword(item); setSubmittedKeyword(item); }} style={[styles.historyChip, { backgroundColor: theme.colors.surfaceMuted }]}><Text style={[styles.historyChipText, { color: theme.colors.textSecondary }]}>{item}</Text></Pressable>)}</View> : <Text style={[styles.historyText, { color: theme.colors.textSecondary }]}>输入关键词开始搜索</Text>}
        </View>
      ) : (
        <View style={styles.results}>
          <View style={styles.resultHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>歌曲</Text>
            {search.isFetching && search.data ? <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>更新中</Text> : null}
            {!isDebouncing && !search.isFetching && search.data ? <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>{results.length} 个结果</Text> : null}
          </View>
          {isDebouncing || search.isPending ? (
            <View style={styles.loading}>
              <Skeleton height={56} />
              <Skeleton height={56} />
              <Skeleton height={56} />
            </View>
          ) : search.isError ? (
            <ErrorState onRetry={() => void search.refetch()} />
          ) : results.length > 0 ? (
            results.map((track, index) => (
              <SongRow
                key={track.id}
                onPress={() => player.playTrack(queueItemFromTrack(track), { queue: results.map(queueItemFromTrack), startIndex: index })}
                track={track}
              />
            ))
          ) : (
            <Text style={[styles.historyText, { color: theme.colors.textSecondary }]}>没有找到匹配的歌曲</Text>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  subtitle: { fontSize: 14, marginTop: 4 },
  search: { marginTop: 20 },
  history: { marginTop: 34 },
  results: { marginTop: 30 },
  resultHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  resultCount: { fontSize: 12 },
  historyText: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  historyList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  historyChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  historyChipText: { fontSize: 13 },
  loading: { gap: 12 },
});
