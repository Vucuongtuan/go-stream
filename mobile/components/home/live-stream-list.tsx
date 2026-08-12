import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

const streams = [
  { game: 'League of Legends', gradient: ['#244DAD', '#142142'] as const, streamer: 'Quang', title: 'Master Yi jungle — leo rank cùng viewer', viewers: '4.2K' },
  { game: 'Valorant', gradient: ['#A32636', '#3B121A'] as const, streamer: 'Vy', title: 'Radiant ranked · custom game sau 2 trận', viewers: '3.6K' },
  { game: 'PUBG', gradient: ['#8A611B', '#2E210E'] as const, streamer: 'Rin', title: 'Scrim cùng team trước PGS', viewers: '2.9K' },
  { game: 'Dota 2', gradient: ['#742D35', '#291216'] as const, streamer: 'Nami', title: 'Support coaching — replay viewer', viewers: '1.7K' },
];

export function LiveStreamList() {
  const { colors } = useAppTheme();

  return (
    <View className="mt-4 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold" style={{ color: colors.text }}>Live now</Text>
        <Text className="text-xs font-bold text-brand">VIEW ALL</Text>
      </View>

      <View className="gap-3">
        {streams.map((stream) => (
          <View key={stream.streamer} className="gap-2">
            <LinearGradient colors={stream.gradient} className="aspect-video w-full justify-between rounded-2xl p-4">
              <View className="self-start rounded-full bg-black/25 px-2.5 py-1">
                <Text className="text-[11px] font-extrabold tracking-widest text-white">LIVE</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <MaterialIcons color="#53FC18" name="visibility" size={16} />
                <Text className="text-sm font-bold text-white">{stream.viewers} watching</Text>
              </View>
            </LinearGradient>
            <Text className="text-base font-bold" style={{ color: colors.text }} numberOfLines={2}>{stream.title}</Text>
            <Text className="text-sm" style={{ color: colors.muted }}>{stream.streamer} · {stream.game}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
