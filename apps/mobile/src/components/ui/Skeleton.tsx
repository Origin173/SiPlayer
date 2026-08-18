import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
}

export function Skeleton({ width = '100%', height, radius = 8 }: SkeletonProps) {
  const { theme } = useTheme();
  return <View style={[styles.base, { backgroundColor: theme.colors.surfaceMuted, height, width, borderRadius: radius }]} />;
}

const styles = StyleSheet.create({ base: { opacity: 0.72 } });
