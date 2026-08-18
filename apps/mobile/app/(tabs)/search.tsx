import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, SearchField } from '@/components/ui';
import { SongRow } from '@/components/music';
import { mockTracks } from '@/features/mockData';
import { queueItemFromTrack } from '@/player/playbackTypes';
import { usePlayer } from '@/player';
import { useTheme } from '@/theme';

export default function SearchScreen() {
  const { theme } = useTheme();
  const player = usePlayer();
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const results = useMemo(
    () => mockTracks.filter((track) => `${track.name} ${track.artistText}`.toLowerCase().includes(submittedKeyword.toLowerCase())),
    [submittedKeyword],
  );

  const submit = () => setSubmittedKeyword(keyword.trim());

  return (
    <Screen>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>搜索</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>找到下一首想听的歌</Text>
      <View style={styles.search}>
        <SearchField autoFocus onChangeText={setKeyword} onSubmit={submit} value={keyword} />
      </View>

      {!submittedKeyword ? (
        <View style={styles.history}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>最近搜索</Text>
          <Text style={[styles.historyText, { color: theme.colors.textSecondary }]}>输入关键词开始搜索</Text>
        </View>
      ) : (
        <View style={styles.results}>
          <View style={styles.resultHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>歌曲</Text>
            <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>{results.length} 个结果</Text>
          </View>
          {results.length > 0 ? results.map((track) => (
            <SongRow
              key={track.id}
              onPress={() => player.playTrack(queueItemFromTrack(track), { queue: results.map(queueItemFromTrack), startIndex: results.indexOf(track) })}
              track={track}
            />
          )) : <Text style={[styles.historyText, { color: theme.colors.textSecondary }]}>没有找到匹配的歌曲</Text>}
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
});
