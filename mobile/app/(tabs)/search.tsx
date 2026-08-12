import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TCta, TText } from '@/components/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { cn } from '@/lib/cn';

const suggestions = ['Liên Minh Huyền Thoại', 'Valorant', 'Just Chatting'];

export default function SearchScreen() {
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const { colors, resolvedTheme } = useAppTheme();
  const surfaceClassName =
    resolvedTheme === 'dark' ? 'bg-theme-surface-dark' : 'bg-theme-surface-light';
  const textClassName =
    resolvedTheme === 'dark' ? 'text-theme-foreground-dark' : 'text-theme-foreground-light';
  const placeholderColor = colors.muted;

  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }, [])
  );

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <TCta tag={SafeAreaView} edges={['top']} className="flex-1 gap-7 px-5 pt-6">
      <View className={cn('h-14 flex-row items-center gap-3 rounded-2xl px-4', surfaceClassName)}>
        <MaterialIcons color={placeholderColor} name="search" size={23} />
        <TextInput
          ref={inputRef}
          accessibilityLabel="Tìm kiếm"
          autoCapitalize="none"
          autoCorrect={false}
          className={cn('flex-1 text-base', textClassName)}
          onChangeText={setQuery}
          placeholder="Tìm stream, streamer hoặc game"
          placeholderTextColor={placeholderColor}
          returnKeyType="search"
          value={query}
        />
        {query ? (
          <Pressable accessibilityLabel="Xóa tìm kiếm" accessibilityRole="button" hitSlop={10} onPress={clearSearch}>
            <MaterialIcons color={placeholderColor} name="cancel" size={20} />
          </Pressable>
        ) : null}
      </View>

      {query ? (
        <View className="items-center gap-3 px-8 pt-16">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-brand/15">
            <MaterialIcons color={colors.tint} name="manage-search" size={30} />
          </View>
          <TText className="text-lg font-bold">Sẵn sàng tìm kiếm</TText>
          <TText className="text-center text-sm leading-5 opacity-60">Kết quả cho “{query}” sẽ hiện ở đây.</TText>
        </View>
      ) : (
        <View className="gap-4">
          <TText className="text-base font-bold">Khám phá nhanh</TText>
          <View className="flex-row flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                accessibilityRole="button"
                className={cn('rounded-full px-4 py-2.5', surfaceClassName)}
                onPress={() => setQuery(suggestion)}>
                <TText className="text-sm font-medium">{suggestion}</TText>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </TCta>
  );
}
