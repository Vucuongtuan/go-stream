import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, View } from 'react-native';

import { TCta, TText } from '@/components/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { cn } from '@/lib/cn';

const details = [
  ['Phiên bản', '1.0.0'],
  ['Nền tảng', 'Expo SDK 54'],
  ['Bản build', 'Demo'],
] as const;

export default function AboutScreen() {
  const { resolvedTheme } = useAppTheme();
  const surfaceClassName =
    resolvedTheme === 'dark' ? 'bg-theme-surface-dark' : 'bg-theme-surface-light';

  return (
    <TCta
      tag={ScrollView}
      className="flex-1"
      contentContainerClassName="gap-6 px-5 pb-10 pt-8"
      contentInsetAdjustmentBehavior="automatic">
      <View className="items-center gap-4 py-5">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand">
          <MaterialIcons color="#FFFFFF" name="play-circle-filled" size={46} />
        </View>
        <View className="items-center gap-1">
          <TText className="text-3xl font-extrabold tracking-tight">GO Stream</TText>
          <TText className="text-sm opacity-60">Every moment, live.</TText>
        </View>
      </View>

      <View className={cn('overflow-hidden rounded-3xl', surfaceClassName)}>
        {details.map(([label, value], index) => (
          <View key={label} className={cn('flex-row items-center justify-between px-5 py-4', index < details.length - 1 && 'border-b border-black/10 dark:border-white/10')}>
            <TText className="text-base">{label}</TText>
            <TText className="text-sm font-semibold opacity-60">{value}</TText>
          </View>
        ))}
      </View>

      <View className="gap-2 px-1">
        <TText className="text-base font-bold">Về GO Stream</TText>
        <TText className="text-sm leading-6 opacity-65">Nơi bạn khám phá, xem và kết nối với những cộng đồng đang phát trực tiếp.</TText>
      </View>
    </TCta>
  );
}
