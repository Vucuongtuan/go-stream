import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

type GameCategory = {
  gradient: readonly [string, string];
  height: number;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  streams: string;
  title: string;
};

const categories: GameCategory[] = [
  { gradient: ['#244DAD', '#142142'], height: 190, icon: 'emoji-events', streams: '1.2K live', title: 'League of Legends' },
  { gradient: ['#8A611B', '#2E210E'], height: 138, icon: 'sports-esports', streams: '840 live', title: 'PUBG' },
  { gradient: ['#742D35', '#291216'], height: 166, icon: 'military-tech', streams: '690 live', title: 'Dota 2' },
  { gradient: ['#A32636', '#3B121A'], height: 140, icon: 'local-fire-department', streams: '975 live', title: 'Valorant' },
  { gradient: ['#1C7392', '#102E43'], height: 168, icon: 'shield', streams: '540 live', title: 'Mobile Legends' },
  { gradient: ['#387A39', '#163517'], height: 192, icon: 'sports-soccer', streams: '420 live', title: 'EA Sports FC' },
];

export function CategoryMasonry() {
  const leftColumn = categories.filter((_, index) => index % 2 === 0);
  const rightColumn = categories.filter((_, index) => index % 2 !== 0);

  return (
    <View className="flex-row gap-3">
      <View className="flex-1 gap-3">
        {leftColumn.map((category) => <CategoryCard key={category.title} category={category} />)}
      </View>
      <View className="flex-1 gap-3">
        {rightColumn.map((category) => <CategoryCard key={category.title} category={category} />)}
      </View>
    </View>
  );
}

function CategoryCard({ category }: { category: GameCategory }) {
  return (
    <LinearGradient colors={category.gradient} style={[styles.card, { height: category.height }]}>
      <View className="flex-row items-center justify-between">
        <MaterialIcons color="#FFFFFF" name={category.icon} size={24} />
        <View className="rounded-full bg-black/25 px-2 py-1">
          <Text className="text-[10px] font-bold text-white">{category.streams}</Text>
        </View>
      </View>
      <Text className="text-lg font-extrabold text-white" numberOfLines={2}>{category.title}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 16,
  },
});
