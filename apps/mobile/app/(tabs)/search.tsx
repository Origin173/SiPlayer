import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SearchType, Track } from '@siplayer/contracts';
import { useCatalogSearch, useTrackSearch } from '@/api/hooks';
import { CatalogRow, SongRow } from '@/components/music';
import { Button, ErrorState, Screen, SearchField, Skeleton } from '@/components/ui';
import { loadSearchHistory, recordSearchKeyword } from '@/features/searchHistory';
import { createSearchPlaySelection } from '@/features/searchPlayback';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePlayer } from '@/player';
import { useTheme } from '@/theme';

export default function SearchScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const player = usePlayer();
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [searchType, setSearchType] = useState<SearchType>('track');
  const debouncedSubmittedKeyword = useDebouncedValue(submittedKeyword, 300);
  const trackSearch = useTrackSearch(debouncedSubmittedKeyword, searchType === 'track');
  const catalogSearch = useCatalogSearch(
    debouncedSubmittedKeyword,
    searchType === 'track' ? 'album' : searchType,
    searchType !== 'track',
  );
  const results = trackSearch.data?.pages.flatMap((page) => page.items) ?? [];
  const catalogItems = catalogSearch.data?.pages.flatMap((page) => page.items) ?? [];
  const activeSearch = searchType === 'track' ? trackSearch : catalogSearch;
  const playSearchTrack = (track: Track) => {
    const selection = createSearchPlaySelection(results, track.id);
    if (!selection) return;
    player.playTrack(selection.item, { queue: selection.queue, startIndex: selection.startIndex });
  };
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

  if (isDebouncing || activeSearch.isPending) {
    return <Screen>{intro}<SearchTypeSwitcher onChange={setSearchType} value={searchType} /><View style={styles.results}><Skeleton height={56} /><Skeleton height={56} /><Skeleton height={56} /></View></Screen>;
  }

  if (activeSearch.isError) {
    return <Screen>{intro}<SearchTypeSwitcher onChange={setSearchType} value={searchType} /><View style={styles.results}><ErrorState onRetry={() => void activeSearch.refetch()} /></View></Screen>;
  }

  if (searchType !== 'track') {
    return (
      <Screen contentContainerStyle={styles.listScreen} scroll={false}>
        <FlashList
          contentContainerStyle={styles.listContent}
          data={catalogItems}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={[styles.historyText, { color: theme.colors.textSecondary }]}>没有找到匹配的结果</Text>}
          ListFooterComponent={catalogSearch.hasNextPage ? <Button disabled={catalogSearch.isFetchingNextPage} onPress={() => void catalogSearch.fetchNextPage()} variant="secondary">{catalogSearch.isFetchingNextPage ? '加载中…' : '加载更多'}</Button> : null}
          ListHeaderComponent={<View style={styles.results}><SearchTypeSwitcher onChange={setSearchType} value={searchType} /><View style={styles.resultHeader}><Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{searchType === 'album' ? '专辑' : searchType === 'artist' ? '歌手' : '歌单'}</Text>{catalogSearch.isFetching ? <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>更新中</Text> : <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>{catalogItems.length} 个结果</Text>}</View></View>}
          onEndReached={() => {
            if (catalogSearch.hasNextPage && !catalogSearch.isFetchingNextPage) void catalogSearch.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => <CatalogRow item={item} onPress={() => {
            if (searchType === 'playlist') router.push(`/playlist/${item.id}`);
            else if (searchType === 'album') router.push(`/album/${item.id}`);
            else router.push(`/artist/${item.id}`);
          }} type={searchType} />}
          showsVerticalScrollIndicator={false}
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.listScreen} scroll={false}>
      <FlashList
        contentContainerStyle={styles.listContent}
        data={results}
        keyExtractor={(track) => track.id}
        ListEmptyComponent={<Text style={[styles.historyText, { color: theme.colors.textSecondary }]}>没有找到匹配的歌曲</Text>}
        ListFooterComponent={trackSearch.hasNextPage ? <Button disabled={trackSearch.isFetchingNextPage} onPress={() => void trackSearch.fetchNextPage()} variant="secondary">{trackSearch.isFetchingNextPage ? '加载中…' : '加载更多'}</Button> : null}
        ListHeaderComponent={<View style={styles.results}><SearchTypeSwitcher onChange={setSearchType} value={searchType} /><View style={styles.resultHeader}><Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>歌曲</Text>{trackSearch.isFetching ? <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>更新中</Text> : <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>{results.length} 个结果</Text>}</View></View>}
        onEndReached={() => {
          if (trackSearch.hasNextPage && !trackSearch.isFetchingNextPage) void trackSearch.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => <SongRow onPress={() => playSearchTrack(item)} track={item} />}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function SearchTypeSwitcher({ value, onChange }: { value: SearchType; onChange: (value: SearchType) => void }) {
  const { theme } = useTheme();
  const options: Array<{ value: SearchType; label: string }> = [
    { value: 'track', label: '歌曲' },
    { value: 'album', label: '专辑' },
    { value: 'artist', label: '歌手' },
    { value: 'playlist', label: '歌单' },
  ];

  return (
    <View style={[styles.segment, { backgroundColor: theme.colors.surfaceMuted }]}>
      {options.map((option) => (
        <Pressable accessibilityLabel={`搜索${option.label}`} accessibilityRole="button" key={option.value} onPress={() => onChange(option.value)} style={[styles.segmentItem, value === option.value && { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.segmentLabel, { color: value === option.value ? theme.colors.textPrimary : theme.colors.textSecondary }]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  subtitle: { fontSize: 14, marginTop: 4 },
  search: { marginTop: 20 },
  history: { marginTop: 34 },
  results: { marginTop: 20 },
  resultHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  resultCount: { fontSize: 12 },
  historyText: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  historyList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  historyChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  historyChipText: { fontSize: 13 },
  listScreen: { paddingHorizontal: 0, paddingBottom: 0 },
  listContent: { paddingBottom: 48, paddingHorizontal: 20 },
  segment: { borderRadius: 999, flexDirection: 'row', gap: 4, marginTop: 20, padding: 3 },
  segmentItem: { alignItems: 'center', borderRadius: 999, flex: 1, minHeight: 38, justifyContent: 'center' },
  segmentLabel: { fontSize: 13, fontWeight: '600' },
});
