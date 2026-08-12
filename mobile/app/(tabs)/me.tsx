import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type Href, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Image from '@/components/Image';
import { TText } from '@/components/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { scheduleDemoNotification } from '@/lib/notifications';
import { resetOnboarding } from '@/lib/onboarding';
import { getCurrentUser, subscribeToCurrentUser, type AuthUser } from '@/lib/auth';

const stats = [
  { label: 'Videos', value: '248' },
  { label: 'Views', value: '33k' },
  { label: 'Followers', value: '1,924' },
];

const profileStats = [
  { icon: 'account-balance-wallet', label: 'Total earnings', value: '₫3,256' },
  { icon: 'visibility', label: 'Profile views', value: '193' },
  { icon: 'sports-esports', label: 'Matches played', value: '250' },
  { icon: 'emoji-events', label: 'Matches won', value: '193' },
] as const;

const recentlyPlayed = [
  { color: '#E6A623', label: 'PUBG' },
  { color: '#E36A35', label: 'FREE FIRE' },
  { color: '#D5B72B', label: 'CALL OF DUTY' },
  { color: '#4387E7', label: 'CLASH ROYALE' },
  { color: '#F13C55', label: 'FIFA 20' },
];

const tabs = ['Profile', 'Videos', 'About'] as const;

export default function MeScreen() {
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Profile');
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState('');
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());

  useEffect(() => subscribeToCurrentUser(setUser), []);

  const displayName = user?.name || 'Guest';
  const handle = user?.slug ? `@${user.slug}` : user?.email || 'Chưa đăng nhập';
  const initial = displayName.charAt(0).toUpperCase();

  const handleDemoNotification = async () => {
    try {
      await scheduleDemoNotification();
      setNotificationStatus('Notification sẽ hiển thị sau 5 giây.');
    } catch {
      setNotificationStatus('Chưa có quyền gửi notification.');
    }
    setIsQuickMenuOpen(false);
  };

  const handleReplayOnboarding = () => {
    resetOnboarding();
    router.replace('/onboarding' as Href);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View className="px-5 pt-3">
          <View className="flex-row items-center justify-between">
            <TText className="text-base font-black">My profile</TText>
            <View className="flex-row gap-4">
              <Pressable accessibilityLabel="Tin nhắn" accessibilityRole="button"><MaterialIcons color={colors.text} name="chat-bubble-outline" size={21} /></Pressable>
              <Pressable accessibilityLabel="Chỉnh sửa hồ sơ" accessibilityRole="button"><MaterialIcons color={colors.text} name="edit" size={21} /></Pressable>
            </View>
          </View>

          <View className="mt-6 flex-row items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full border-2 bg-brand" style={{ borderColor: colors.background }}>
              {user?.avatar ? <Image accessible contentFit="cover" src={user.avatar} style={styles.avatarImage} /> : <TText className="text-2xl font-black text-[#18181B]">{initial}</TText>}
              <View className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 bg-brand" style={{ borderColor: colors.background }} />
            </View>
            <View className="ml-3 flex-1">
              <TText className="text-xl font-black">{displayName}</TText>
              <TText className="mt-0.5 text-sm" numberOfLines={1} style={{ color: colors.muted }}>{handle} · {user?.role || 'Guest'}</TText>
            </View>
            <Pressable accessibilityRole="button" className="rounded-xl border px-3 py-2" style={{ borderColor: colors.border }}>
              <TText className="text-xs font-black">Edit profile</TText>
            </Pressable>
          </View>

          <View className="mt-6 flex-row justify-between px-1">
            {stats.map((stat) => (
              <View key={stat.label} className="items-center">
                <TText className="text-lg font-black">{stat.value}</TText>
                <TText className="mt-0.5 text-xs" style={{ color: colors.muted }}>{stat.label}</TText>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-6 flex-row border-b px-5" style={{ borderColor: colors.border }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: isActive }} className="mr-7 pb-3" onPress={() => setActiveTab(tab)}>
                <TText className="text-sm font-bold" style={{ color: isActive ? colors.tint : colors.muted }}>{tab}</TText>
                {isActive ? <View className="absolute bottom-0 h-0.5 w-full bg-brand" /> : null}
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'Profile' ? (
          <View className="gap-5 px-5 pt-5">
            <View className="flex-row flex-wrap gap-2">
              {profileStats.map((stat) => (
                <View key={stat.label} className="w-[49%] rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <MaterialIcons color={colors.tint} name={stat.icon} size={20} />
                  <TText className="mt-4 text-2xl font-black">{stat.value}</TText>
                  <TText className="mt-1 text-xs" style={{ color: colors.muted }}>{stat.label}</TText>
                </View>
              ))}
            </View>

            <View className="rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2"><MaterialIcons color={colors.tint} name="history" size={19} /><TText className="font-black">Recently played</TText></View>
                <TText className="text-xs font-bold text-brand">See all</TText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gameList}>
                {recentlyPlayed.map((game) => (
                  <View key={game.label} style={[styles.gameTile, { backgroundColor: game.color }]}>
                    <MaterialIcons color="#FFFFFF" name="sports-esports" size={26} />
                    <TText className="mt-2 text-center text-[9px] font-black leading-3 text-white">{game.label}</TText>
                  </View>
                ))}
              </ScrollView>
            </View>

            <Pressable accessibilityRole="button" className="mb-6 flex-row items-center justify-between rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View className="flex-row items-center gap-3"><View className="h-9 w-9 items-center justify-center rounded-xl bg-brand/15"><MaterialIcons color={colors.tint} name="emoji-events" size={20} /></View><View><TText className="font-black">My tournaments</TText><TText className="mt-0.5 text-xs" style={{ color: colors.muted }}>View your upcoming matches</TText></View></View>
              <MaterialIcons color={colors.muted} name="chevron-right" size={22} />
            </Pressable>
          </View>
        ) : (
          <View className="items-center px-5 py-14"><MaterialIcons color={colors.muted} name={activeTab === 'Videos' ? 'video-library' : 'person-outline'} size={34} /><TText className="mt-3 font-bold">{activeTab === 'Videos' ? 'Chưa có video nào' : 'Thông tin hồ sơ'}</TText><TText className="mt-1 text-center text-sm" style={{ color: colors.muted }}>{activeTab === 'Videos' ? 'Video của bạn sẽ xuất hiện tại đây.' : 'Streamer · Mobile gamer · Thành viên từ 2025'}</TText></View>
        )}
      </ScrollView>

      <View pointerEvents="box-none" style={styles.quickActions}>
        {notificationStatus ? (
          <View className="mb-3 rounded-xl px-3 py-2" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}>
            <TText className="text-xs" style={{ color: colors.muted }}>{notificationStatus}</TText>
          </View>
        ) : null}
        {isQuickMenuOpen ? (
          <View className="mb-3 items-end gap-2">
            <Pressable accessibilityRole="button" className="flex-row items-center gap-2 rounded-full border py-2 pl-3 pr-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }} onPress={handleDemoNotification}>
              <TText className="text-xs font-bold">Test notification</TText>
              <View className="h-8 w-8 items-center justify-center rounded-full bg-brand"><MaterialIcons color="#18181B" name="notifications-none" size={18} /></View>
            </Pressable>
            {__DEV__ ? (
              <Pressable accessibilityRole="button" className="flex-row items-center gap-2 rounded-full border py-2 pl-3 pr-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }} onPress={handleReplayOnboarding}>
                <TText className="text-xs font-bold">Replay onboarding</TText>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-brand"><MaterialIcons color="#18181B" name="replay" size={18} /></View>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Pressable accessibilityLabel="Mở tác vụ nhanh" accessibilityRole="button" accessibilityState={{ expanded: isQuickMenuOpen }} className="h-14 w-14 items-center justify-center self-end rounded-full bg-brand" onPress={() => setIsQuickMenuOpen((open) => !open)} style={styles.fab}>
          <MaterialIcons color="#18181B" name={isQuickMenuOpen ? 'close' : 'apps'} size={24} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 96 },
  avatarImage: { borderRadius: 32, height: '100%', width: '100%' },
  fab: { elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  gameList: { gap: 10 },
  gameTile: { alignItems: 'center', borderRadius: 12, height: 82, justifyContent: 'center', paddingHorizontal: 8, width: 72 },
  // Keep the speed dial above the persistent bottom-tab bar.
  quickActions: { bottom: 88, position: 'absolute', right: 20 },
  safeArea: { flex: 1 },
});
