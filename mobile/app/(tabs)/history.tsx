import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';

const historyItems = [
  { title: 'Building a cozy workspace', creator: 'Mai Studio', time: '12 min ago' },
  { title: 'Road to radiant', creator: 'Khanh Plays', time: 'Yesterday' },
  { title: 'Lo-fi beats for late coding', creator: 'minh.mp3', time: 'Yesterday' },
];

export default function HistoryScreen() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Watch history</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Pick up where you left off.</Text>

        <View style={styles.list}>
          {historyItems.map((item) => (
            <View key={item.title} style={[styles.item, { backgroundColor: colors.surface }]}>
              <View style={[styles.thumbnail, { backgroundColor: colors.tint }]}>
                <MaterialIcons color="#FFFFFF" name="play-arrow" size={30} />
              </View>
              <View style={styles.itemContent}>
                <Text numberOfLines={1} style={[styles.itemTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.meta, { color: colors.text }]}>{item.creator}</Text>
                <Text style={[styles.meta, { color: colors.text }]}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 16, marginTop: 6, opacity: 0.7 },
  list: { gap: 12, marginTop: 24 },
  item: { borderRadius: 16, flexDirection: 'row', gap: 14, padding: 12 },
  thumbnail: { alignItems: 'center', borderRadius: 12, height: 72, justifyContent: 'center', width: 100 },
  itemContent: { flex: 1, gap: 3, justifyContent: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, opacity: 0.65 },
  safeArea: { flex: 1 },
});
