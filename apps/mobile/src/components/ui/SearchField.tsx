import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/theme';
import { IconButton } from './IconButton';

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchField({
  value,
  onChangeText,
  onSubmit,
  placeholder = '搜索歌曲、歌手或专辑',
  autoFocus = false,
}: SearchFieldProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
      <Ionicons color={theme.colors.textTertiary} name="search-outline" size={20} />
      <TextInput
        accessibilityLabel="搜索"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        returnKeyType="search"
        style={[styles.input, { color: theme.colors.textPrimary }]}
        value={value}
      />
      {value.length > 0 ? (
        <IconButton accessibilityLabel="清除搜索" iconSize={18} name="close-circle" onPress={() => onChangeText('')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 15, marginHorizontal: 8, paddingVertical: 0 },
});
