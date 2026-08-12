import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';

export function HomeTopTabBar({ descriptors, navigation, state }: MaterialTopTabBarProps) {
  const { colors, resolvedTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const mutedClassName = resolvedTheme === 'dark' ? 'text-white' : 'text-black';
  const gradientColors = resolvedTheme === 'dark'
    ? ['rgba(13, 23, 16, 0.96)', 'rgba(13, 23, 16, 0.62)', 'rgba(13, 23, 16, 0)'] as const
    : ['rgba(246, 251, 247, 0.96)', 'rgba(246, 251, 247, 0.62)', 'rgba(246, 251, 247, 0)'] as const;

  return (
    <View
      className="absolute inset-x-0 top-0 z-10 flex-row items-center !bg-transparent"
      pointerEvents="box-none"
      style={{ height: insets.top + 48, paddingTop: insets.top }}>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.55, 1]}
        pointerEvents="none"
        style={[styles.scrim, { height: insets.top + 112 }]}
      />
      <View className="h-12 flex-1 flex-row bg-transparent">
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const label = descriptors[route.key].options.title ?? route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              className="h-12 items-start justify-center px-5"
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              onPress={() => {
                const event = navigation.emit({ canPreventDefault: true, target: route.key, type: 'tabPress' });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}>
              <Text className={`text-2xl font-bold ${isFocused ? 'text-brand' : mutedClassName}`} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityLabel="Notifications"
        accessibilityRole="button"
        className="h-12 w-[52px] items-center justify-center"
        hitSlop={8}
        onPress={() => router.navigate('/notification' as Href)}>
        <MaterialIcons color={colors.text} name="notifications-none" size={25} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
