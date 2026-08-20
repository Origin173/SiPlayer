import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '@/components/music';
import { MINI_PLAYER_GAP, TAB_BAR_HEIGHT } from '@/layout/overlayMetrics';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.divider,
            borderTopWidth: 1,
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '首页',
            tabBarIcon: ({ color, size }) => <Ionicons color={color} name="home-outline" size={size} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: '搜索',
            tabBarIcon: ({ color, size }) => <Ionicons color={color} name="search-outline" size={size} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: '音乐库',
            tabBarIcon: ({ color, size }) => <Ionicons color={color} name="library-outline" size={size} />,
          }}
        />
      </Tabs>
      <View pointerEvents="box-none" style={[styles.miniPlayer, { bottom: TAB_BAR_HEIGHT + MINI_PLAYER_GAP + insets.bottom }]}>
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  miniPlayer: { left: 12, position: 'absolute', right: 12 },
});
