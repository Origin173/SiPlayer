import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

interface ArtworkProps {
  uri?: string | null;
  title: string;
  size?: number;
}

export function Artwork({ uri, title, size = 48 }: ArtworkProps) {
  const { theme } = useTheme();
  const initial = title.trim().slice(0, 1).toUpperCase() || '♪';

  if (uri) {
    return <Image accessibilityLabel={`${title} 封面`} contentFit="cover" source={{ uri }} style={{ height: size, width: size, borderRadius: theme.radius.sm }} />;
  }

  return (
    <View style={[styles.fallback, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.sm, height: size, width: size }]}>
      <Text style={[styles.initial, { color: theme.colors.primary, fontSize: Math.max(size * 0.36, 16) }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '700' },
});
