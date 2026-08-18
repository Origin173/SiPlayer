import { FlashList, type FlashListRef } from '@shopify/flash-list';
import type { LyricLine } from '@siplayer/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

interface LyricsListProps {
  lines: LyricLine[];
  positionMs: number;
  onSeek: (positionMs: number) => void;
}

export function LyricsList({ lines, positionMs, onSeek }: LyricsListProps) {
  const { theme } = useTheme();
  const listRef = useRef<FlashListRef<LyricLine> | null>(null);
  const [followsPlayback, setFollowsPlayback] = useState(true);
  const activeIndex = useMemo(() => {
    let index = -1;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      if (line && line.startMs <= positionMs) index = lineIndex;
      else break;
    }
    return index;
  }, [lines, positionMs]);

  useEffect(() => {
    if (!followsPlayback || activeIndex < 0) return;
    listRef.current?.scrollToIndex({ index: activeIndex, animated: true, viewPosition: 0.5 });
  }, [activeIndex, followsPlayback]);

  return (
    <View style={styles.root}>
      <FlashList
        contentContainerStyle={styles.content}
        data={lines}
        keyExtractor={(item, index) => `${item.startMs}-${index}`}
        onScrollBeginDrag={() => setFollowsPlayback(false)}
        ref={listRef}
        renderItem={({ item, index }) => {
          const active = index === activeIndex;
          return (
            <Pressable
              accessibilityLabel={`跳转到 ${item.text}`}
              accessibilityRole="button"
              onPress={() => onSeek(item.startMs)}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : active ? 1 : 0.62 }]}
            >
              <Text style={[styles.text, { color: active ? theme.colors.textPrimary : theme.colors.textSecondary, fontSize: active ? 20 : 16, fontWeight: active ? '700' : '500' }]}>
                {item.text}
              </Text>
              {item.translation ? <Text style={[styles.translation, { color: active ? theme.colors.textSecondary : theme.colors.textTertiary }]}>{item.translation}</Text> : null}
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
      {!followsPlayback && activeIndex >= 0 ? (
        <View style={styles.followOverlay}>
          <LyricsFollowButton onPress={() => setFollowsPlayback(true)} />
        </View>
      ) : null}
    </View>
  );
}

export function LyricsFollowButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable accessibilityLabel="回到当前歌词" accessibilityRole="button" onPress={onPress} style={[styles.followButton, { backgroundColor: theme.colors.primarySoft }]}>
      <Text style={[styles.followLabel, { color: theme.colors.primary }]}>回到当前</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 24 },
  followOverlay: { bottom: 20, left: 0, position: 'absolute', right: 0 },
  row: { minHeight: 68, paddingVertical: 10 },
  text: { lineHeight: 28 },
  translation: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  followButton: { alignSelf: 'center', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  followLabel: { fontSize: 12, fontWeight: '600' },
});
