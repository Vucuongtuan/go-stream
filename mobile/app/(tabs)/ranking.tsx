import { StyleSheet, View, Image } from 'react-native';
import { GlassView } from 'expo-glass-effect';

export default function RankingScreen() {
  return (
    <View style={styles.container}>
      <Image
        style={styles.backgroundImage}
        source={{
          uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
        }}
      />

      {/* Basic Glass View */}
      <GlassView style={styles.glassView}  glassEffectStyle={'regular'}/>

      {/* Glass View with clear style */}
      <GlassView style={styles.tintedGlassView} glassEffectStyle="clear" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  glassView: {
    position: 'absolute',
    top: 100,
    left: 50,
    width: 200,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tintedGlassView: {
    position: 'absolute',
    top: 250,
    left: 50,
    width: 200,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
});
