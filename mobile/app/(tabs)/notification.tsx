import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TText } from '@/components/theme';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/hooks/use-app-theme';

const notifications = [
  {
    id: 'stream-live',
    icon: 'live-tv',
    iconClassName: 'bg-rose-500',
    title: 'Huy Gaming vừa lên sóng',
    body: 'Valorant ranked · Đang có 1.2K người xem',
    time: '2 phút',
    unread: true,
  },
  {
    id: 'followed',
    icon: 'favorite',
    iconClassName: 'bg-violet-500',
    title: 'Bạn có người theo dõi mới',
    body: 'Minh Anh đã bắt đầu theo dõi kênh của bạn.',
    time: '1 giờ',
    unread: true,
  },
  {
    id: 'weekly',
    icon: 'emoji-events',
    iconClassName: 'bg-amber-500',
    title: 'Tổng kết tuần của bạn',
    body: 'Bạn đã phát trực tiếp 8 giờ trong tuần này.',
    time: 'Hôm qua',
    unread: false,
  },
] as const;

export default function NotificationScreen() {
  const { resolvedTheme } = useAppTheme();
  const surfaceClassName =
    resolvedTheme === 'dark' ? 'bg-theme-surface-dark' : 'bg-theme-surface-light';

  return (
    <SafeAreaView edges={['top']} className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 px-5 pb-10 pt-6">
      <View className="mb-3 flex-row items-end justify-between">
        <View className="gap-1">
          <TText className="text-3xl font-extrabold tracking-tight">Notifications</TText>
          <TText className="text-sm opacity-60">Bạn có 2 cập nhật mới</TText>
        </View>
        <Pressable accessibilityRole="button" className="rounded-full px-3 py-2">
          <TText className="text-sm font-semibold text-brand">Đọc tất cả</TText>
        </Pressable>
      </View>

      {notifications.map((notification) => (
        <Pressable
          key={notification.id}
          accessibilityRole="button"
          className={cn('flex-row gap-3 rounded-3xl p-4', surfaceClassName)}>
          <View className={cn('h-11 w-11 items-center justify-center rounded-2xl', notification.iconClassName)}>
            <MaterialIcons color="#FFFFFF" name={notification.icon} size={22} />
          </View>
          <View className="flex-1 gap-1">
            <View className="flex-row items-start gap-2">
              <TText className="flex-1 text-[15px] font-bold leading-5">{notification.title}</TText>
              {notification.unread ? <View className="mt-1.5 h-2 w-2 rounded-full bg-brand" /> : null}
            </View>
            <TText className="text-sm leading-5 opacity-65">{notification.body}</TText>
            <TText className="pt-1 text-xs font-medium opacity-45">{notification.time}</TText>
          </View>
        </Pressable>
      ))}
      </ScrollView>
    </SafeAreaView>
  );
}
