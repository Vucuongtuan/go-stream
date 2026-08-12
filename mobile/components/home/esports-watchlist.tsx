import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

const tournaments = [
  { game: 'League of Legends', icon: 'emoji-events' as const, status: 'LCK Summer · 20:00', title: 'T1 vs Gen.G' },
  { game: 'PUBG', icon: 'sports-esports' as const, status: 'PGS 9 · Live now', title: 'Group Stage · Day 2' },
  { game: 'Dota 2', icon: 'military-tech' as const, status: 'TI Qualifier · Tomorrow', title: 'Upper bracket final' },
];

export function EsportsWatchlist() {
  const { colors, resolvedTheme } = useAppTheme();
  const surfaceClassName = resolvedTheme === 'dark' ? 'bg-theme-surface-dark' : 'bg-theme-surface-light';

  return (
    <View className="mt-4 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold" style={{ color: colors.text }}>Esports watchlist</Text>
        <Text className="text-xs font-bold text-brand">SEE ALL</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
        {tournaments.map((tournament) => (
          <View key={tournament.game} className={`w-52 gap-3 rounded-3xl p-4 ${surfaceClassName}`}>
            <MaterialIcons color={colors.tint} name={tournament.icon} size={25} />
            <View className="gap-1">
              <Text className="font-bold" style={{ color: colors.text }}>{tournament.game}</Text>
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>{tournament.title}</Text>
              <Text className="text-xs" style={{ color: colors.muted }}>{tournament.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
