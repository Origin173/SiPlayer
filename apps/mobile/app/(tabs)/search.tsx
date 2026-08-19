import { useEffect, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTrackSearch } from '@/api/hooks';
import { Button, ErrorState, Screen, SearchField, Skeleton } from '@/components/ui';
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
  const results = search.data?.pages.flatMap((page) => page.items) ?? [];
  const queueItems = results.map(queueItemFromTrack);
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

  const intro = (
    <>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>搜索</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>找到下一首想听的歌</Text>
      <View style={styles.search}>
        <SearchField autoFocus onChangeText={onChangeKeyword} onSubmit={submit} value={keyword} />
      </View>
    </>
  );

  if (!submittedKeyword) {
    return (
      <Screen>
        {intro}
        <View style={styles.history}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>最近搜索</Text>
          {history.length > 0 ? <View style={styles.historyList}>{history.map((item) => <Pressable key={item} accessibilityLabel={`再次搜索 ${item}`} accessibilityRole="button" onPress={() => { setKeyword(item); setSubmittedKeyword(item); }} style={[styles.historyChip, { backgroundColor: theme.colors.surfaceMuted }]}><Text style={[styles.historyChipText, { color: theme.colors.textSecondary }]}>{item}</Text></Pressable>)}</View> : <Text style={[styles.historyText, { color: theme.colors.textSecondary }]}>输入关键词开始搜索</Text>}
        </View>
      </Screen>
    );
  }

  if (isDebouncing || search.isPending) {
    return <Screen>{intro}<View style={styles.results}><Skeleton height={56} /><Skeleton height={56} /><Skeleton height={56} /></View></Screen>;
  }

  if (search.isError) {
    return <Screen>{intro}<View style={styles.results}><ErrorState onRetry={() => void search.refetch()} /></View></Screen>;
  }

  return (
    <Screen contentContainerStyle={styles.listScreen} scroll={false}>
      <FlashList
        contentContainerStyle={styles.listContent}
        data={results}
        keyExtractor={(track) => track.id}
        ListEmptyComponent={<Text style={[styles.historyText, { color: theme.colors.textSecondary }]}>没有找到匹配的歌曲</Text>}
        ListFooterComponent={search.hasNextPage ? <Button disabled={search.isFetchingNextPage} onPress={() => void search.fetchNextPage()} variant="secondary">{search.isFetchingNextPage ? '加载中…' : '加载更多'}</Button> : null}
        ListHeaderComponent={(
          <View style={styles.results}>
            <View style={styles.resultHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>歌曲</Text>
              {search.isFetching ? <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>更新中</Text> : <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>{results.length} 个结果</Text>}
            </View>
          </View>
        )}
        onEndReached={() => {
          if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item, index }) => (
          <SongRow
            onPress={() => player.playTrack(queueItemFromTrack(item), { queue: queueItems, startIndex: index })}
            track={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
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
  listScreen: { paddingHorizontal: 0, paddingBottom: 0 },
  listContent: { paddingBottom: 48, paddingHorizontal: 20 },
});
