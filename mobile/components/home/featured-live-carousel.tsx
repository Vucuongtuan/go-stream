import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type FeaturedStream = {
  game: string;
  gameInfo: string;
  gradient: readonly [string, string];
  id: string;
  rank: number;
  streamer: string;
  title: string;
  viewers: string;
};

const featuredStreams: FeaturedStream[] = [
  {
    game: 'League of Legends',
    gameInfo: 'Challenger 1,246 LP · LCK Summer tonight',
    gradient: ['#193C86', '#0E172F'],
    id: 'lol-minh',
    rank: 1,
    streamer: 'Minh',
    title: 'Climb Challenger — duo queue cùng chat',
    viewers: '12.4K',
  },
  {
    game: 'PUBG: Battlegrounds',
    gameInfo: 'PUBG Global Series · Top 100 SEA',
    gradient: ['#765117', '#1E160C'],
    id: 'pubg-khoa',
    rank: 2,
    streamer: 'Khoa',
    title: 'Road to Global Series — squad practice',
    viewers: '9.8K',
  },
  {
    game: 'Dota 2',
    gameInfo: 'The International Qualifier · Immortal #214',
    gradient: ['#592429', '#1E1114'],
    id: 'dota-hana',
    rank: 3,
    streamer: 'Hana',
    title: 'Ranked grind — support masterclass',
    viewers: '7.1K',
  },
];

export function FeaturedLiveCarousel() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = width - 40;
  const snapInterval = cardWidth + 12;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Featured live</Text>
        <Text className="text-xs font-bold text-brand">TOP VIEWERS</Text>
      </View>

      <FlatList
        data={featuredStreams}
        decelerationRate="fast"
        horizontal
        keyExtractor={(stream) => stream.id}
        onMomentumScrollEnd={(event) => {
          setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / snapInterval));
        }}
        pagingEnabled={false}
        renderItem={({ item }) => (
          <LinearGradient colors={item.gradient} style={[styles.card, { width: cardWidth }]}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1">
                <View className="h-1.5 w-1.5 rounded-full bg-[#53FC18]" />
                <Text className="text-[11px] font-extrabold tracking-widest text-white">LIVE</Text>
              </View>
              <Text className="text-sm font-extrabold text-white/90">#{item.rank}</Text>
            </View>

            <View className="flex-1 justify-end gap-2">
              <View className="flex-row items-center gap-1.5">
                <MaterialIcons color="#53FC18" name="visibility" size={16} />
                <Text className="text-sm font-bold text-white">{item.viewers} watching</Text>
              </View>
              <Text className="text-2xl font-extrabold text-white" numberOfLines={2}>{item.title}</Text>
              <Text className="text-base font-semibold text-white/90">{item.streamer} · {item.game}</Text>
              <Text className="text-sm text-white/70" numberOfLines={1}>{item.gameInfo}</Text>
            </View>
          </LinearGradient>
        )}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        style={styles.list}
      />

      <View className="flex-row justify-center gap-1.5">
        {featuredStreams.map((stream, index) => (
          <View
            key={stream.id}
            className="h-1.5 rounded-full"
            style={{ backgroundColor: index === activeIndex ? colors.tint : colors.muted, width: index === activeIndex ? 18 : 6 }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    height: 264,
    marginRight: 12,
    overflow: 'hidden',
    padding: 20,
  },
  list: {
    marginHorizontal: -20,
    paddingLeft: 20,
  },
});
